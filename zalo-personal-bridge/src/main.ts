import { config } from './config/env.js';
import { Database } from './persistence/postgres/db.js';
import { Keyring } from './security/keyring.js';
import { EnvelopeCipher } from './security/envelope-cipher.js';
import { SessionManager } from './sessions/session-manager.js';
import { InboundWorker } from './workers/inbound-worker.js';
import { OutboundWorker } from './workers/outbound-worker.js';
import { CleanupWorker } from './workers/cleanup-worker.js';
import { buildApp } from './app.js';
import { setupGracefulShutdown } from './shutdown.js';
import { InboundEventV1 } from './contracts/inbound-event-v1.js';

async function bootstrap() {
  const db = new Database(config.databaseUrl);
  await db.runMigrations();

  const keyring = new Keyring(config.encryptionKeys, config.activeKeyId);
  const cipher = new EnvelopeCipher(keyring);

  const inboundWorker = new InboundWorker(
    db,
    config.chatwootWebhookUrl,
    config.serviceSecret
  );

  const handleInboundEvent = async (event: InboundEventV1) => {
    const integrationId = event.integration_id || (event as any).integrationId;
    if (!integrationId) {
      console.warn('Dropping inbound event without integration_id:', event.event_id);
      return;
    }

    // Persist event to DB
    try {
      await db.query(`
        INSERT INTO zalo_inbound_events (event_id, integration_id, event_type, sequence, payload, status, occurred_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        ON CONFLICT (event_id) DO NOTHING
      `, [
        event.event_id,
        integrationId,
        event.type,
        event.sequence,
        event,
        event.occurred_at,
      ]);
      console.log(`[Inbound] Queued event ${event.event_id} (${event.type}) for integration ${integrationId}`);
    } catch (err: any) {
      console.error(`[Inbound] Failed to persist event ${event.event_id}:`, err.message);
    }
  };

  const sessionManager = new SessionManager(
    db,
    cipher,
    config.podId,
    handleInboundEvent
  );

  const outboundWorker = new OutboundWorker(
    db,
    sessionManager,
    config.podId
  );

  const cleanupWorker = new CleanupWorker(db);

  const app = buildApp(db, sessionManager, cipher, config.serviceSecret);

  // Start background services
  await sessionManager.start();
  inboundWorker.start();
  outboundWorker.start();
  cleanupWorker.start();

  setupGracefulShutdown(
    app,
    db,
    sessionManager,
    inboundWorker,
    outboundWorker,
    cleanupWorker
  );

  await app.listen({ port: config.port, host: config.host });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
