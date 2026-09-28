import { Database } from '../persistence/postgres/db.js';

export class CleanupWorker {
  private timer: NodeJS.Timeout | null = null;

  constructor(private db: Database) {}

  start(): void {
    // Run every hour
    this.timer = setInterval(async () => {
      await this.runCleanup();
    }, 3600 * 1000);
  }

  async runCleanup(): Promise<void> {
    try {
      // 1. Delete delivered inbound events older than 7 days
      await this.db.query(`
        DELETE FROM zalo_inbound_events 
        WHERE status = 'delivered' AND created_at < NOW() - INTERVAL '7 days'
      `);

      // 2. Delete completed outbound deliveries older than 30 days
      await this.db.query(`
        DELETE FROM zalo_outbound_deliveries 
        WHERE status IN ('sent', 'failed') AND created_at < NOW() - INTERVAL '30 days'
      `);
    } catch {
      // Cleanup error
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
