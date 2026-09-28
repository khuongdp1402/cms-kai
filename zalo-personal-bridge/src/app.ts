import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import crypto from 'crypto';
import { Database } from './persistence/postgres/db.js';
import { SessionManager } from './sessions/session-manager.js';
import { EnvelopeCipher } from './security/envelope-cipher.js';
import { HmacVerifier } from './security/hmac-verifier.js';
import { metrics } from './telemetry/metrics.js';
import { logger } from './telemetry/logger.js';
import { OutboundCommandV1Schema, OutboundCommandV1 } from './contracts/outbound-command-v1.js';
import { Zalo } from 'zca-js';

const QR_FLOW_TTL_MS = 100_000;
const QR_FLOW_RETENTION_MS = 300_000;
// zca-js 2.1.2 sends Chrome 130 / Windows client hints during QR login.
// Keep the user agent in the same browser fingerprint so the provider sees a consistent request.
const ZALO_QR_LOGIN_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

interface QrCredentials {
  cookie: unknown[];
  imei: string;
  userAgent: string;
}

interface QrProfile {
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ActiveQrFlow {
  flowId: string;
  integrationId: string;
  status: string;
  qrDataUrl: string | null;
  expiresAt: string;
  authenticatedAt: string | null;
  profile: QrProfile | null;
  credentials?: QrCredentials;
  capabilities: Record<string, unknown>;
  errorCode: 'zalo_login_incomplete' | 'zalo_login_failed' | null;
  expiryTimer?: NodeJS.Timeout;
  cleanupTimer?: NodeJS.Timeout;
}

const activeQrFlows: Map<string, ActiveQrFlow> = new Map();

class ZaloLoginIncompleteError extends Error {
  constructor() {
    super('Zalo login resolved without all required session fields');
    this.name = 'ZaloLoginIncompleteError';
  }
}

function sanitizedErrorDetails(error: unknown): { errorClass: string; errorMessage: string } {
  let errorClass = 'UnknownError';
  let errorMessage = 'Unknown Zalo login error';

  if (error instanceof Error) {
    errorClass = error.name || error.constructor.name || errorClass;
    errorMessage = error.message || errorMessage;
  } else if (typeof error === 'string') {
    errorClass = 'StringError';
    errorMessage = error;
  }

  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(errorClass)) {
    errorClass = 'UnknownError';
  }

  errorMessage = errorMessage.replace(/[\r\n\t]+/g, ' ').trim();
  const containsSensitiveData = /(authorization|cookie|credentials?|data:image|imei|password|qr(?:code|[_ -]?(?:data|image))?|secret|token|user[_ -]?agent|zpw_)/i.test(errorMessage);
  if (containsSensitiveData) {
    errorMessage = 'Provider error details redacted';
  } else {
    errorMessage = errorMessage
      .replace(/\b[A-Za-z0-9+/]{80,}={0,2}\b/g, '[REDACTED]')
      .slice(0, 500) || 'Unknown Zalo login error';
  }

  return { errorClass, errorMessage };
}

function failQrFlow(
  flow: ActiveQrFlow,
  errorCode: 'zalo_login_incomplete' | 'zalo_login_failed',
  phase: 'login_resolution' | 'login_promise' | 'login_start',
  error: unknown
): void {
  const preservesTerminalStatus = ['expired', 'declined', 'consumed'].includes(flow.status);

  if (!preservesTerminalStatus) {
    flow.status = 'failed';
    flow.errorCode = errorCode;
    if (flow.expiryTimer) {
      clearTimeout(flow.expiryTimer);
      flow.expiryTimer = undefined;
    }
    clearFlowSecrets(flow);
    scheduleFlowRemoval(flow);
  }

  const { errorClass, errorMessage } = sanitizedErrorDetails(error);
  const logContext = {
    event: preservesTerminalStatus ? 'zalo_qr_login_error_after_terminal_status' : 'zalo_qr_login_failed',
    flow_id: flow.flowId,
    integration_id: flow.integrationId,
    phase,
    status: flow.status,
    error_code: preservesTerminalStatus ? flow.errorCode : errorCode,
    error_class: errorClass,
    error_message: errorMessage,
  };

  if (errorCode === 'zalo_login_incomplete' || preservesTerminalStatus) {
    logger.warn(logContext, 'Zalo QR login completed without a usable session');
  } else {
    logger.error(logContext, 'Zalo QR login failed');
  }
}

function isUsableCredentials(value: unknown): value is QrCredentials {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const credentials = value as Record<string, unknown>;
  return Array.isArray(credentials.cookie)
    && credentials.cookie.length > 0
    && typeof credentials.imei === 'string'
    && credentials.imei.length > 0
    && typeof credentials.userAgent === 'string'
    && credentials.userAgent.length > 0;
}

function clearFlowSecrets(flow: ActiveQrFlow): void {
  flow.qrDataUrl = null;
  flow.credentials = undefined;
}

function scheduleFlowRemoval(flow: ActiveQrFlow): void {
  if (flow.cleanupTimer) {
    clearTimeout(flow.cleanupTimer);
  }

  flow.cleanupTimer = setTimeout(() => {
    if (activeQrFlows.get(flow.flowId) === flow) {
      clearFlowSecrets(flow);
      activeQrFlows.delete(flow.flowId);
    }
  }, QR_FLOW_RETENTION_MS);
  flow.cleanupTimer.unref();
}

function expireFlow(flow: ActiveQrFlow): void {
  if (Date.parse(flow.expiresAt) > Date.now() || ['authenticated', 'consumed', 'failed'].includes(flow.status)) {
    return;
  }

  flow.status = 'expired';
  clearFlowSecrets(flow);
  scheduleFlowRemoval(flow);
}

function sanitizedIntegration(row: any) {
  return {
    integration_id: row.id,
    status: row.status,
    session_generation: parseInt(row.session_generation, 10),
    lease_owner: row.lease_owner || null,
    lease_until: row.lease_until || null,
    profile: {
      user_id: row.zalo_user_id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    },
    capabilities: row.capabilities || {},
  };
}

async function findIntegration(db: Database, integrationId: string) {
  const res = await db.query(`
    SELECT i.id, i.account_id, i.inbox_id, i.status, i.session_generation, i.zalo_user_id,
           i.display_name, i.avatar_url, i.capabilities, l.pod_id AS lease_owner, l.lease_until
    FROM zalo_integrations i
    LEFT JOIN zalo_integration_leases l ON i.id = l.integration_id
    WHERE i.id = $1
  `, [integrationId]);

  return res.rows[0] || null;
}

export function buildApp(
  db: Database,
  sessionManager: SessionManager,
  cipher: EnvelopeCipher,
  serviceSecret: string
): FastifyInstance {
  const app = Fastify({
    logger: false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Health Probes
  app.get('/health/live', async () => ({ status: 'alive' }));
  app.get('/health/ready', async () => ({ status: 'ready' }));
  app.get('/health/startup', async () => ({ status: 'started' }));

  // Metrics
  app.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', metrics.registry.contentType);
    return metrics.registry.metrics();
  });

  // Custom body parser to capture rawBody for HMAC verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as any).rawBody = body;
    try {
      const json = body ? JSON.parse(body as string) : {};
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  // Internal Authentication Hook
  app.addHook('preHandler', async (req, reply) => {
    const url = req.url;
    if (url.startsWith('/health') || url === '/metrics') {
      return;
    }

    const keyId = req.headers['x-zalo-personal-key-id'] as string;
    const timestamp = req.headers['x-zalo-personal-timestamp'] as string;
    const nonce = req.headers['x-zalo-personal-nonce'] as string;
    const signature = req.headers['x-zalo-personal-signature'] as string;

    const rawBody = ((req as any).rawBody !== undefined ? (req as any).rawBody : (req.body ? JSON.stringify(req.body) : '')) as string;
    const isValid = HmacVerifier.verify(serviceSecret, signature, timestamp, nonce, rawBody, 60);

    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized: Invalid HMAC signature' });
      return;
    }
  });

  // Integration Status
  app.get('/internal/v1/integrations/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const integration = await findIntegration(db, id);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    return sanitizedIntegration(integration);
  });

  // Delete Integration: Stops runtime and completely wipes credentials & integration records
  app.delete('/internal/v1/integrations/:id', async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      await sessionManager.stopIntegration(id, 'Integration deleted');
      await db.query('DELETE FROM zalo_integrations WHERE id = $1', [id]);
      return reply.status(200).send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Disconnect Integration: Stops runtime and disables integration
  app.post('/internal/v1/integrations/:id/disconnect', async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      await sessionManager.stopIntegration(id, 'Integration disconnected');
      await db.query(
        "UPDATE zalo_integrations SET status = 'disabled', updated_at = NOW() WHERE id = $1",
        [id]
      );
      return reply.status(200).send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Reconnect Integration: Reactivate an existing integration
  app.post('/internal/v1/integrations/:id/reconnect', async (req, reply) => {
    const { id } = req.params as { id: string };
    const integration = await findIntegration(db, id);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    await db.query("UPDATE zalo_integrations SET status = 'connecting', updated_at = NOW() WHERE id = $1", [id]);
    const started = await sessionManager.activateIntegration(id, parseInt(integration.session_generation, 10));

    if (!started) {
      return reply.status(422).send({ error: 'Unable to start the Zalo integration session' });
    }

    const updated = await findIntegration(db, id);
    return sanitizedIntegration(updated || integration);
  });

  // QR Flow: Start
  app.post('/internal/v1/integrations/:id/qr-flows', async (req, reply) => {
    const { id } = req.params as { id: string };
    const flowId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + QR_FLOW_TTL_MS).toISOString();

    const flowData: ActiveQrFlow = {
      flowId,
      integrationId: id,
      status: 'pending',
      qrDataUrl: null,
      expiresAt,
      authenticatedAt: null,
      profile: null,
      capabilities: {},
      errorCode: null,
    };
    activeQrFlows.set(flowId, flowData);
    flowData.expiryTimer = setTimeout(() => expireFlow(flowData), QR_FLOW_TTL_MS);
    flowData.expiryTimer.unref();

    // Call native loginQR asynchronously
    try {
      const zalo = new Zalo({ checkUpdate: false });
      zalo.loginQR(
        { userAgent: ZALO_QR_LOGIN_USER_AGENT },
        async (event: any) => {
          if (event.type === 0 || event.type === 'QRCodeGenerated' || event.data?.image) {
            flowData.status = 'qr_ready';
            const rawImg = event.data?.image || event.data;
            if (rawImg && typeof rawImg === 'string') {
              flowData.qrDataUrl = rawImg.startsWith('data:') ? rawImg : `data:image/png;base64,${rawImg}`;
            }
          } else if (event.type === 2 || event.type === 'QRCodeScanned') {
            flowData.status = 'awaiting_confirmation';
            flowData.profile = {
              user_id: null,
              display_name: typeof event.data?.display_name === 'string' ? event.data.display_name : null,
              avatar_url: typeof event.data?.avatar === 'string' ? event.data.avatar : null,
            };
          } else if (event.type === 1 || event.type === 'QRCodeExpired') {
            flowData.status = 'expired';
            clearFlowSecrets(flowData);
            scheduleFlowRemoval(flowData);
          } else if (event.type === 3 || event.type === 'QRCodeDeclined') {
            flowData.status = 'declined';
            clearFlowSecrets(flowData);
            scheduleFlowRemoval(flowData);
          } else if (event.type === 4 || event.type === 'GotLoginInfo') {
            const credentials = {
              cookie: event.data?.cookie,
              imei: event.data?.imei,
              userAgent: event.data?.userAgent,
            };
            flowData.credentials = isUsableCredentials(credentials) ? credentials : undefined;
          }
        }
      ).then((api: any) => {
        const ownId = api?.getOwnId?.();
        if (!api || !isUsableCredentials(flowData.credentials) || typeof ownId !== 'string' || ownId.length === 0) {
          failQrFlow(
            flowData,
            'zalo_login_incomplete',
            'login_resolution',
            new ZaloLoginIncompleteError()
          );
          return;
        }

        flowData.status = 'authenticated';
        flowData.errorCode = null;
        flowData.authenticatedAt = new Date().toISOString();
        flowData.profile = {
          user_id: ownId,
          display_name: flowData.profile?.display_name || ownId,
          avatar_url: flowData.profile?.avatar_url || null,
        };
        if (flowData.expiryTimer) {
          clearTimeout(flowData.expiryTimer);
          flowData.expiryTimer = undefined;
        }
        scheduleFlowRemoval(flowData);
      }).catch((error: unknown) => {
        failQrFlow(flowData, 'zalo_login_failed', 'login_promise', error);
      });
    } catch (error: unknown) {
      failQrFlow(flowData, 'zalo_login_failed', 'login_start', error);
    }

    // Wait briefly up to 2.5s for initial QR image to be generated before responding
    const startWait = Date.now();
    while (!flowData.qrDataUrl
      && !['failed', 'expired', 'declined'].includes(flowData.status)
      && Date.now() - startWait < 2500) {
      await new Promise((r) => setTimeout(r, 100));
    }

    return reply.status(201).send({
      flow_id: flowId,
      status: flowData.status,
      qr_data_url: flowData.qrDataUrl,
      expires_at: expiresAt,
      error_code: flowData.errorCode,
    });
  });

  // QR Flow: Get Status
  app.get('/internal/v1/integrations/:id/qr-flows/:flow_id', async (req, reply) => {
    const { id, flow_id } = req.params as { id: string; flow_id: string };
    const flowData = activeQrFlows.get(flow_id);

    if (!flowData || flowData.integrationId !== id) {
      return reply.status(404).send({ error: 'QR flow not found or expired' });
    }

    expireFlow(flowData);

    return {
      flow_id: flowData.flowId,
      status: flowData.status,
      qr_data_url: flowData.qrDataUrl,
      expires_at: flowData.expiresAt,
      authenticated_at: flowData.authenticatedAt,
      profile: flowData.profile || null,
      capabilities: flowData.capabilities,
      error_code: flowData.errorCode,
    };
  });

  // QR Flow: Persist credentials and activate the integration
  app.post('/internal/v1/integrations/:id/qr-flows/:flow_id/consume', async (req, reply) => {
    const { id, flow_id } = req.params as { id: string; flow_id: string };
    const flowData = activeQrFlows.get(flow_id);
    const body = (req.body || {}) as Record<string, unknown>;
    const accountId = Number(body.account_id);
    const inboxId = body.inbox_id === undefined || body.inbox_id === null ? null : Number(body.inbox_id);
    const sessionGeneration = Number(body.session_generation);

    if (!Number.isSafeInteger(accountId) || accountId <= 0
      || (inboxId !== null && (!Number.isSafeInteger(inboxId) || inboxId <= 0))
      || !Number.isSafeInteger(sessionGeneration) || sessionGeneration < 0) {
      return reply.status(422).send({ error: 'account_id, inbox_id, or session_generation is invalid' });
    }

    const existing = await findIntegration(db, id);
    const existingGeneration = existing ? parseInt(existing.session_generation, 10) : null;

    if (existing && String(existing.account_id) !== String(accountId)) {
      return reply.status(409).send({ error: 'Integration belongs to a different account' });
    }

    if (flowData && flowData.integrationId !== id) {
      return reply.status(409).send({ error: 'QR flow is not valid for this integration' });
    }

    if (existing && existingGeneration === sessionGeneration && existing.status === 'connected') {
      if (inboxId !== null && String(existing.inbox_id || '') !== String(inboxId)) {
        await db.query('UPDATE zalo_integrations SET inbox_id = $2, updated_at = NOW() WHERE id = $1', [id, inboxId]);
        existing.inbox_id = inboxId;
      }
      if (flowData) {
        flowData.status = 'consumed';
        clearFlowSecrets(flowData);
        scheduleFlowRemoval(flowData);
      }
      return sanitizedIntegration(existing);
    }

    if (!flowData) {
      return reply.status(409).send({ error: 'QR flow is not valid for this integration' });
    }

    expireFlow(flowData);

    if (flowData.status === 'consumed') {
      if (!existing || existingGeneration !== sessionGeneration) {
        return reply.status(409).send({ error: 'QR flow has already been consumed for another session generation' });
      }

      return sanitizedIntegration(existing);
    }

    if (flowData.status !== 'authenticated') {
      return reply.status(409).send({ error: `QR flow is ${flowData.status}` });
    }

    if (!isUsableCredentials(flowData.credentials) || !flowData.profile?.user_id) {
      return reply.status(422).send({ error: 'QR flow does not contain usable login credentials' });
    }

    if (existingGeneration !== null && existingGeneration > sessionGeneration) {
      return reply.status(409).send({ error: 'A newer integration session already exists' });
    }

    try {
      const encryptedCredentials = cipher.encrypt(
        JSON.stringify(flowData.credentials),
        `${id}:${sessionGeneration}`
      );

      // Disable any previous active integration for the same Zalo user
      await db.query(
        "UPDATE zalo_integrations SET status = 'disabled', updated_at = NOW() WHERE zalo_user_id = $1 AND id != $2 AND status != 'disabled'",
        [flowData.profile.user_id, id]
      );

      await db.query(`
        INSERT INTO zalo_integrations (
          id, account_id, inbox_id, status, encrypted_credentials, key_id, session_generation,
          zalo_user_id, display_name, avatar_url, capabilities, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'connecting', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          account_id = EXCLUDED.account_id,
          inbox_id = COALESCE(EXCLUDED.inbox_id, zalo_integrations.inbox_id),
          status = 'connecting',
          encrypted_credentials = EXCLUDED.encrypted_credentials,
          key_id = EXCLUDED.key_id,
          session_generation = EXCLUDED.session_generation,
          zalo_user_id = EXCLUDED.zalo_user_id,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          capabilities = EXCLUDED.capabilities,
          updated_at = NOW()
      `, [
        id,
        accountId,
        inboxId,
        JSON.stringify(encryptedCredentials),
        encryptedCredentials.keyId,
        sessionGeneration,
        flowData.profile.user_id,
        flowData.profile.display_name,
        flowData.profile.avatar_url,
        flowData.capabilities,
      ]);

      const started = await sessionManager.activateIntegration(id, sessionGeneration);
      if (!started) {
        return reply.status(422).send({ error: 'Unable to start the Zalo integration session' });
      }

      const integration = await findIntegration(db, id);
      if (!integration || integration.status !== 'connected') {
        return reply.status(422).send({ error: 'Zalo integration did not reach connected status' });
      }

      flowData.status = 'consumed';
      clearFlowSecrets(flowData);
      scheduleFlowRemoval(flowData);
      return sanitizedIntegration(integration);
    } catch (err: any) {
      console.error('Error persisting or activating Zalo integration:', err);
      return reply.status(422).send({ error: err.message || 'Unable to persist or activate the Zalo integration' });
    }
  });

  // Outbound Message: Enqueue
  app.post('/internal/v1/integrations/:id/messages', {
    schema: {
      body: OutboundCommandV1Schema,
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const command = req.body as OutboundCommandV1;

    const payloadStr = JSON.stringify(command);
    const payloadSha256 = crypto.createHash('sha256').update(payloadStr).digest('hex');

    try {
      await db.query(`
        INSERT INTO zalo_outbound_deliveries (delivery_id, integration_id, idempotency_key, payload_sha256, payload, status)
        VALUES ($1, $2, $3, $4, $5, 'queued')
        ON CONFLICT (integration_id, idempotency_key) DO UPDATE
        SET updated_at = NOW()
      `, [command.delivery_id, id, command.idempotency_key, payloadSha256, command]);

      return reply.status(202).send({
        delivery_id: command.delivery_id,
        status: 'queued',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Outbound Message: Delivery Status
  app.get('/internal/v1/integrations/:id/messages/:delivery_id', async (req, reply) => {
    const { delivery_id } = req.params as { delivery_id: string };
    const res = await db.query(
      `SELECT delivery_id, status, provider_message_ids, last_error, updated_at FROM zalo_outbound_deliveries WHERE delivery_id = $1`,
      [delivery_id]
    );

    if (res.rowCount === 0) {
      return reply.status(404).send({ error: 'Delivery not found' });
    }

    return res.rows[0];
  });

  // Sticker Catalog
  app.get('/internal/v1/integrations/:id/stickers', async () => {
    return {
      stickers: [],
    };
  });

  // Groups: List all groups
  app.get('/internal/v1/integrations/:id/groups', async (req, reply) => {
    const { id } = req.params as { id: string };
    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;
    if (typeof adapter.fetchAllGroups === 'function') {
      const groups = await adapter.fetchAllGroups();
      return { groups };
    }

    return { groups: [] };
  });

  // Groups: Get batch info for given group IDs
  app.post('/internal/v1/integrations/:id/groups/batch', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { group_ids } = (req.body || {}) as { group_ids?: string[] };
    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;
    if (typeof adapter.getGroupsMetadata === 'function' && Array.isArray(group_ids) && group_ids.length > 0) {
      const groups = await adapter.getGroupsMetadata(group_ids);
      return { groups };
    }

    return { groups: [] };
  });

  // Groups: Get single group info
  app.get('/internal/v1/integrations/:id/groups/:group_id', async (req, reply) => {
    const { id, group_id } = req.params as { id: string; group_id: string };
    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;
    if (typeof adapter.getGroupMetadata === 'function') {
      const meta = await adapter.getGroupMetadata(group_id);
      if (meta) {
        return { group_id, ...meta };
      }
    }

    return reply.status(404).send({ error: 'Group info not found' });
  });

  // Groups: Fetch chat history for a group
  app.post('/internal/v1/integrations/:id/groups/:group_id/history', async (req, reply) => {
    const { id, group_id } = req.params as { id: string; group_id: string };
    const body = (req.body || {}) as Record<string, unknown>;
    const count = Math.min(Math.max(Number(body.count) || 50, 1), 200);

    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;
    if (typeof adapter.fetchGroupHistory !== 'function') {
      return reply.status(422).send({ error: 'Group history sync is not supported by this adapter' });
    }

    try {
      const result = await adapter.fetchGroupHistory(group_id, count);
      return {
        messages: result.messages,
        total: result.messages.length,
        has_more: result.hasMore,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to fetch group history' });
    }
  });

  // Force sync: request old/unread messages for all thread types
  app.post('/internal/v1/integrations/:id/sync', async (req, reply) => {
    const { id } = req.params as { id: string };

    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;
    if (!adapter.zaloApi?.listener) {
      return reply.status(422).send({ error: 'Listener not active for this integration' });
    }

    try {
      adapter.zaloApi.listener.requestOldMessages(0); // ThreadType.User = 0
      adapter.zaloApi.listener.requestOldMessages(1); // ThreadType.Group = 1
      return {
        success: true,
        message: 'Sync requested — messages will arrive via old_messages event',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to request message sync' });
    }
  });

  // Fetch all contacts: friends + groups for full conversation sync
  app.get('/internal/v1/integrations/:id/contacts', async (req, reply) => {
    const { id } = req.params as { id: string };

    const runtime = sessionManager.getRuntime(id);
    if (!runtime) {
      return reply.status(404).send({ error: 'Active session not found for this integration' });
    }

    const adapter = runtime.session as any;

    try {
      const [friends, groups] = await Promise.all([
        typeof adapter.fetchAllFriends === 'function' ? adapter.fetchAllFriends() : [],
        typeof adapter.fetchAllGroups === 'function' ? adapter.fetchAllGroups() : [],
      ]);

      return {
        friends,
        groups,
        total_friends: friends.length,
        total_groups: groups.length,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to fetch contacts' });
    }
  });

  app.addHook('onClose', async () => {
    for (const flow of activeQrFlows.values()) {
      if (flow.expiryTimer) clearTimeout(flow.expiryTimer);
      if (flow.cleanupTimer) clearTimeout(flow.cleanupTimer);
      clearFlowSecrets(flow);
    }
    activeQrFlows.clear();
  });

  return app;
}
