import { ZaloSession } from '../adapters/zalo/zalo-adapter.js';
import { Database } from '../persistence/postgres/db.js';
import { LIMITS } from '../config/limits.js';
import { InboundEventV1 } from '../contracts/inbound-event-v1.js';

export class AccountRuntime {
  private leaseRenewTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    public readonly integrationId: string,
    public readonly session: ZaloSession,
    private db: Database,
    private podId: string,
    private onInboundEvent: (event: InboundEventV1) => Promise<void>
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start inbound listener
    await this.session.startListener(async (event) => {
      await this.onInboundEvent(event);
    });

    // Start lease renewal loop every 10 seconds
    this.leaseRenewTimer = setInterval(async () => {
      await this.renewLease();
    }, LIMITS.LEASE_RENEW_MS);
  }

  private async renewLease(): Promise<void> {
    const leaseUntil = new Date(Date.now() + LIMITS.LEASE_TTL_MS);
    try {
      const res = await this.db.query(
        `UPDATE zalo_integration_leases 
         SET lease_until = $1, renewed_at = NOW() 
         WHERE integration_id = $2 AND pod_id = $3`,
        [leaseUntil, this.integrationId, this.podId]
      );
      if (res.rowCount === 0) {
        // Lease was lost or taken by another pod!
        await this.stop('Lease lost during renewal');
      }
    } catch {
      // Lease update error
    }
  }

  async stop(reason: string): Promise<void> {
    this.isRunning = false;
    if (this.leaseRenewTimer) {
      clearInterval(this.leaseRenewTimer);
      this.leaseRenewTimer = null;
    }
    await this.session.stop(reason);
  }
}
