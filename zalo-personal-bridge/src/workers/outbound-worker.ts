import { Database } from '../persistence/postgres/db.js';
import { SessionManager } from '../sessions/session-manager.js';
import { TempWorkspace } from '../media/temp-workspace.js';
import { MediaFetcher } from '../media/media-fetcher.js';
import { OutboundCommandV1 } from '../contracts/outbound-command-v1.js';
import { logger } from '../telemetry/logger.js';

export class OutboundWorker {
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private db: Database,
    private sessionManager: SessionManager,
    private podId: string
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pollTimer = setInterval(async () => {
      await this.processQueue();
    }, 1000);
  }

  async processQueue(): Promise<void> {
    try {
      // Find queued outbound deliveries belonging to integrations owned by this pod
      const res = await this.db.query(`
        SELECT d.delivery_id, d.integration_id, d.payload, l.fencing_token
        FROM zalo_outbound_deliveries d
        JOIN zalo_integration_leases l ON d.integration_id = l.integration_id
        WHERE d.status = 'queued'
          AND l.pod_id = $1
          AND l.lease_until > NOW()
        ORDER BY d.created_at ASC
        LIMIT 5
        FOR UPDATE OF d SKIP LOCKED
      `, [this.podId]);

      for (const row of res.rows) {
        await this.executeDelivery(row);
      }
    } catch {
      // Queue processing error
    }
  }

  private async executeDelivery(row: any): Promise<void> {
    const runtime = this.sessionManager.getRuntime(row.integration_id);
    if (!runtime) {
      return; // Lease might have expired
    }

    // Mark as processing
    await this.db.query(
      `UPDATE zalo_outbound_deliveries SET status = 'processing', attempts = attempts + 1, updated_at = NOW() WHERE delivery_id = $1`,
      [row.delivery_id]
    );

    const command: OutboundCommandV1 = row.payload;
    const workspace = new TempWorkspace();
    const localAttachmentPaths: string[] = [];

    try {
      if (command.message.attachments && command.message.attachments.length > 0) {
        await workspace.create();
        for (let i = 0; i < command.message.attachments.length; i++) {
          const att = command.message.attachments[i];
          const localFile = workspace.getPath(`att_${i}_${att.filename || 'file'}`);
          logger.info(
            { delivery_id: row.delivery_id, attachment_index: i, download_url: att.download_url, filename: att.filename },
            'Downloading attachment for outbound message'
          );
          const fetched = await MediaFetcher.fetchToLocalPath(att.download_url, localFile, att.mime_type);
          logger.info(
            { delivery_id: row.delivery_id, attachment_index: i, bytes: fetched.bytes, mime: fetched.mime },
            'Attachment downloaded successfully'
          );
          localAttachmentPaths.push(fetched.path);
        }
      }

      const result = await (runtime.session as any).send(command, localAttachmentPaths);

      if (result.success) {
        await this.db.query(
          `UPDATE zalo_outbound_deliveries 
           SET status = 'sent', provider_message_ids = $1, updated_at = NOW() 
           WHERE delivery_id = $2`,
          [JSON.stringify(result.providerMessageIds), row.delivery_id]
        );
      } else {
        await this.db.query(
          `UPDATE zalo_outbound_deliveries 
           SET status = 'failed', last_error = $1, updated_at = NOW() 
           WHERE delivery_id = $2`,
          [result.error || 'Provider send failed', row.delivery_id]
        );
      }
    } catch (err: any) {
      await this.db.query(
        `UPDATE zalo_outbound_deliveries 
         SET status = 'failed', last_error = $1, updated_at = NOW() 
         WHERE delivery_id = $2`,
        [err.message, row.delivery_id]
      );
    } finally {
      await workspace.cleanup();
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
