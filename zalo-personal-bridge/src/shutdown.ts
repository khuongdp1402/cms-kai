import { FastifyInstance } from 'fastify';
import { Database } from './persistence/postgres/db.js';
import { SessionManager } from './sessions/session-manager.js';
import { InboundWorker } from './workers/inbound-worker.js';
import { OutboundWorker } from './workers/outbound-worker.js';
import { CleanupWorker } from './workers/cleanup-worker.js';

export function setupGracefulShutdown(
  app: FastifyInstance,
  db: Database,
  sessionManager: SessionManager,
  inboundWorker: InboundWorker,
  outboundWorker: OutboundWorker,
  cleanupWorker: CleanupWorker
): void {
  let isShuttingDown = false;

  const onShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
      inboundWorker.stop();
      outboundWorker.stop();
      cleanupWorker.stop();

      await sessionManager.shutdown();
      await app.close();
      await db.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => onShutdown('SIGTERM'));
  process.on('SIGINT', () => onShutdown('SIGINT'));
}
