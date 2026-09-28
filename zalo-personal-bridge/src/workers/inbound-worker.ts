import { Database } from '../persistence/postgres/db.js';
import { HmacVerifier } from '../security/hmac-verifier.js';
import { fetch } from 'undici';

export class InboundWorker {
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private db: Database,
    private chatwootWebhookUrl: string,
    private serviceSecret: string
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pollTimer = setInterval(async () => {
      await this.processPendingEvents();
    }, 2000);
  }

  async processPendingEvents(): Promise<void> {
    try {
      const res = await this.db.query(`
        SELECT event_id, integration_id, payload, attempts
        FROM zalo_inbound_events
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      `);

      for (const row of res.rows) {
        await this.dispatchToRails(row);
      }
    } catch {
      // Worker loop error
    }
  }

  private async dispatchToRails(row: any): Promise<void> {
    const payloadStr = JSON.stringify(row.payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = `n_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const hmacHeaders = HmacVerifier.sign(this.serviceSecret, 'service', timestamp, nonce, payloadStr);
    const targetUrl = `${this.chatwootWebhookUrl}/${row.integration_id}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zalo-Personal-Key-Id': hmacHeaders.keyId,
          'X-Zalo-Personal-Timestamp': hmacHeaders.timestamp,
          'X-Zalo-Personal-Nonce': hmacHeaders.nonce,
          'X-Zalo-Personal-Signature': hmacHeaders.signature,
        },
        body: payloadStr,
      });

      if (response.ok || response.status === 200 || response.status === 202) {
        await this.db.query(`UPDATE zalo_inbound_events SET status = 'delivered' WHERE event_id = $1`, [row.event_id]);
      } else {
        await this.db.query(
          `UPDATE zalo_inbound_events SET attempts = attempts + 1, last_error = $1 WHERE event_id = $2`,
          [`HTTP ${response.status}`, row.event_id]
        );
      }
    } catch (err: any) {
      await this.db.query(
        `UPDATE zalo_inbound_events SET attempts = attempts + 1, last_error = $1 WHERE event_id = $2`,
        [err.message, row.event_id]
      );
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
