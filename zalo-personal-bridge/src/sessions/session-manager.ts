import { Database } from '../persistence/postgres/db.js';
import { EnvelopeCipher } from '../security/envelope-cipher.js';
import { AccountRuntime } from './account-runtime.js';
import { ZcaJsAdapter, ZcaCredentials } from '../adapters/zalo/zca-js-adapter.js';
import { InboundEventV1 } from '../contracts/inbound-event-v1.js';
import { LIMITS } from '../config/limits.js';

export class SessionManager {
  private activeRuntimes: Map<string, AccountRuntime> = new Map();
  private activeGenerations: Map<string, number> = new Map();
  private activations: Map<string, { generation: number; promise: Promise<boolean> }> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private db: Database,
    private cipher: EnvelopeCipher,
    private podId: string,
    private onInboundEvent: (event: InboundEventV1) => Promise<void>
  ) {}

  async start(): Promise<void> {
    // Initial lease claim & start poll loop
    await this.reconcileSessions();
    this.pollInterval = setInterval(() => {
      this.reconcileSessions().catch(() => {});
    }, 15000);
  }

  async reconcileSessions(): Promise<void> {
    if (this.activeRuntimes.size >= LIMITS.MAX_SESSIONS_PER_POD) {
      return;
    }

    // Find enabled connected/connecting integrations without an active lease
    const res = await this.db.query(`
      SELECT i.id, i.account_id, i.session_generation, i.zalo_user_id, i.display_name, i.avatar_url, i.encrypted_credentials, i.key_id
      FROM zalo_integrations i
      LEFT JOIN zalo_integration_leases l ON i.id = l.integration_id
      WHERE i.status IN ('connected', 'connecting')
        AND (l.integration_id IS NULL OR l.lease_until < NOW())
      LIMIT $1
    `, [LIMITS.MAX_SESSIONS_PER_POD - this.activeRuntimes.size]);

    for (const row of res.rows) {
      await this.activateIntegration(row.id, parseInt(row.session_generation, 10));
    }
  }

  async activateIntegration(integrationId: string, sessionGeneration: number): Promise<boolean> {
    const currentActivation = this.activations.get(integrationId);
    if (currentActivation) {
      if (currentActivation.generation === sessionGeneration) {
        return currentActivation.promise;
      }

      await currentActivation.promise.catch(() => false);
      return this.activateIntegration(integrationId, sessionGeneration);
    }

    const activation = this.startIntegration(integrationId, sessionGeneration);
    this.activations.set(integrationId, { generation: sessionGeneration, promise: activation });

    try {
      return await activation;
    } finally {
      if (this.activations.get(integrationId)?.promise === activation) {
        this.activations.delete(integrationId);
      }
    }
  }

  private async startIntegration(integrationId: string, sessionGeneration: number): Promise<boolean> {
    const currentRuntime = this.activeRuntimes.get(integrationId);
    const currentGeneration = this.activeGenerations.get(integrationId);

    if (currentRuntime && currentGeneration === sessionGeneration) {
      const health = await currentRuntime.session.healthCheck();
      if (health.connected) {
        return true;
      }
    }

    if (currentRuntime) {
      await this.stopIntegration(integrationId, 'Session credentials changed');
    }

    if (this.activeRuntimes.size >= LIMITS.MAX_SESSIONS_PER_POD) {
      return false;
    }

    const res = await this.db.query(`
      SELECT id, account_id, session_generation, zalo_user_id, display_name, avatar_url, encrypted_credentials, key_id
      FROM zalo_integrations
      WHERE id = $1 AND session_generation = $2 AND status IN ('connected', 'connecting')
    `, [integrationId, sessionGeneration]);

    if (res.rowCount === 0) {
      return false;
    }

    return this.claimAndStartIntegration(res.rows[0]);
  }

  async claimAndStartIntegration(row: any): Promise<boolean> {
    const leaseUntil = new Date(Date.now() + LIMITS.LEASE_TTL_MS);
    
    // Attempt to acquire or take over lease
    const claimRes = await this.db.query(`
      INSERT INTO zalo_integration_leases (integration_id, pod_id, lease_until, fencing_token, renewed_at)
      VALUES ($1, $2, $3, 1, NOW())
      ON CONFLICT (integration_id) DO UPDATE
      SET pod_id = $2, lease_until = $3, fencing_token = zalo_integration_leases.fencing_token + 1, renewed_at = NOW()
      WHERE zalo_integration_leases.lease_until < NOW() OR zalo_integration_leases.pod_id = $2
      RETURNING fencing_token
    `, [row.id, this.podId, leaseUntil]);

    if (claimRes.rowCount === 0) {
      return false; // Could not acquire lease
    }

    let runtime: AccountRuntime | null = null;

    try {
      // Decrypt credentials
      const encryptedCredentials = typeof row.encrypted_credentials === 'string'
        ? JSON.parse(row.encrypted_credentials)
        : row.encrypted_credentials;
      const sessionGeneration = parseInt(row.session_generation, 10);
      const credsJson = this.cipher.decrypt(
        {
          keyId: row.key_id,
          iv: encryptedCredentials.iv,
          tag: encryptedCredentials.tag,
          ciphertext: encryptedCredentials.ciphertext,
        },
        `${row.id}:${sessionGeneration}`
      );
      const creds: ZcaCredentials = JSON.parse(credsJson);

      const adapter = new ZcaJsAdapter(
        row.id,
        sessionGeneration,
        {
          userId: row.zalo_user_id,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
        },
        creds
      );

      runtime = new AccountRuntime(
        row.id,
        adapter,
        this.db,
        this.podId,
        this.onInboundEvent
      );

      await runtime.start();
      this.activeRuntimes.set(row.id, runtime);
      this.activeGenerations.set(row.id, sessionGeneration);

      // Update status to connected
      await this.db.query(
        `UPDATE zalo_integrations SET status = 'connected', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
      return true;
    } catch (err: any) {
      if (runtime) {
        await runtime.stop('Session startup failed').catch(() => {});
      }
      // Release lease if startup fails
      await this.db.query(`DELETE FROM zalo_integration_leases WHERE integration_id = $1 AND pod_id = $2`, [row.id, this.podId]);
      return false;
    }
  }

  getRuntime(integrationId: string): AccountRuntime | undefined {
    return this.activeRuntimes.get(integrationId);
  }

  async stopIntegration(integrationId: string, reason: string): Promise<void> {
    const runtime = this.activeRuntimes.get(integrationId);
    try {
      if (runtime) {
        await runtime.stop(reason);
      }
    } finally {
      this.activeRuntimes.delete(integrationId);
      this.activeGenerations.delete(integrationId);
      await this.db.query(`DELETE FROM zalo_integration_leases WHERE integration_id = $1 AND pod_id = $2`, [integrationId, this.podId]);
    }
  }

  async shutdown(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    for (const [id, runtime] of this.activeRuntimes.entries()) {
      try {
        await runtime.stop('Bridge shutdown');
        await this.db.query(`DELETE FROM zalo_integration_leases WHERE integration_id = $1 AND pod_id = $2`, [id, this.podId]);
      } catch {}
    }
    this.activeRuntimes.clear();
    this.activeGenerations.clear();
    this.activations.clear();
  }
}
