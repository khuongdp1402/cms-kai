import dotenv from 'dotenv';
dotenv.config();

export interface BridgeConfig {
  port: number;
  host: string;
  databaseUrl: string;
  redisUrl: string;
  chatwootWebhookUrl: string;
  chatwootBaseUrl: string;
  frontendUrl: string;
  serviceSecret: string;
  encryptionKeys: Record<string, string>;
  activeKeyId: string;
  logLevel: string;
  podId: string;
  leaseTtlMs: number;
  leaseRenewMs: number;
}

export function loadConfig(): BridgeConfig {
  const port = parseInt(process.env.PORT || '5001', 10);
  const host = process.env.HOST || '0.0.0.0';
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chatwoot';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const chatwootWebhookUrl = process.env.CHATWOOT_WEBHOOK_URL || 'http://localhost:3000/webhooks/zalo_personal';
  const chatwootBaseUrl = process.env.CHATWOOT_BASE_URL || chatwootWebhookUrl.replace(/\/webhooks\/.*$/, '');
  const frontendUrl = process.env.FRONTEND_URL || '';
  const serviceSecret = process.env.ZALO_BRIDGE_SERVICE_SECRET || 'dev_service_secret_32bytes_long_key!';
  const activeKeyId = process.env.ZALO_BRIDGE_ACTIVE_KEY_ID || 'k1';
  
  let encryptionKeys: Record<string, string> = {};
  if (process.env.ZALO_BRIDGE_ENCRYPTION_KEYS) {
    try {
      encryptionKeys = JSON.parse(process.env.ZALO_BRIDGE_ENCRYPTION_KEYS);
    } catch {
      encryptionKeys = { [activeKeyId]: process.env.ZALO_BRIDGE_ENCRYPTION_KEYS };
    }
  } else {
    // Default 32-byte hex key for dev
    encryptionKeys = { [activeKeyId]: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' };
  }

  const logLevel = process.env.LOG_LEVEL || 'info';
  const podId = process.env.POD_NAME || process.env.HOSTNAME || `bridge-node-${Math.random().toString(36).substring(2, 8)}`;
  const leaseTtlMs = parseInt(process.env.LEASE_TTL_MS || '30000', 10);
  const leaseRenewMs = parseInt(process.env.LEASE_RENEW_MS || '10000', 10);

  return {
    port,
    host,
    databaseUrl,
    redisUrl,
    chatwootWebhookUrl,
    chatwootBaseUrl,
    frontendUrl,
    serviceSecret,
    encryptionKeys,
    activeKeyId,
    logLevel,
    podId,
    leaseTtlMs,
    leaseRenewMs,
  };
}

export const config = loadConfig();
