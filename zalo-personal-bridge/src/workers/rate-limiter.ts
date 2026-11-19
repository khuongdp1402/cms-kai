import { LIMITS } from '../config/limits.js';

export interface SendRateLimiterOptions {
  accountSendsPerMinute?: number;
  accountBurstMax?: number;
  globalSendsPerMinute?: number;
  windowMs?: number;
}

interface AccountBucket {
  tokens: number;
  lastRefillMs: number;
  timestamps: number[];
}

const DEFAULT_WINDOW_MS = 60_000;

export class SendRateLimiter {
  private readonly accountSendsPerMinute: number;
  private readonly accountBurstMax: number;
  private readonly globalSendsPerMinute: number;
  private readonly windowMs: number;
  private readonly accounts = new Map<string, AccountBucket>();
  private globalTimestamps: number[] = [];

  constructor(options: SendRateLimiterOptions = {}) {
    this.accountSendsPerMinute =
      options.accountSendsPerMinute ?? LIMITS.ACCOUNT_SENDS_PER_MINUTE;
    this.accountBurstMax = options.accountBurstMax ?? LIMITS.ACCOUNT_BURST_MAX;
    this.globalSendsPerMinute =
      options.globalSendsPerMinute ?? LIMITS.GLOBAL_SENDS_PER_MINUTE;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  }

  canSendGlobal(now = Date.now()): boolean {
    this.pruneGlobal(now);
    return this.globalTimestamps.length < this.globalSendsPerMinute;
  }

  canSend(integrationId: string, now = Date.now()): boolean {
    if (!this.canSendGlobal(now)) return false;
    const bucket = this.syncBucket(integrationId, now);
    return (
      bucket.tokens >= 1 &&
      bucket.timestamps.length < this.accountSendsPerMinute
    );
  }

  tryAcquire(integrationId: string, now = Date.now()): boolean {
    if (!this.canSend(integrationId, now)) return false;
    const bucket = this.syncBucket(integrationId, now);
    bucket.tokens -= 1;
    bucket.timestamps.push(now);
    this.globalTimestamps.push(now);
    return true;
  }

  blockedIntegrationIds(candidateIds: string[], now = Date.now()): string[] {
    const blocked: string[] = [];
    const seen = new Set<string>();
    for (const id of candidateIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!this.canSend(id, now)) {
        blocked.push(id);
      }
    }
    return blocked;
  }

  prune(now = Date.now()): void {
    this.pruneGlobal(now);
    for (const [id, bucket] of this.accounts.entries()) {
      this.syncExistingBucket(bucket, now);
      if (
        bucket.timestamps.length === 0 &&
        bucket.tokens >= this.accountBurstMax
      ) {
        this.accounts.delete(id);
      }
    }
  }

  private pruneGlobal(now: number): void {
    const cutoff = now - this.windowMs;
    if (this.globalTimestamps.length === 0) return;
    this.globalTimestamps = this.globalTimestamps.filter(ts => ts > cutoff);
  }

  private syncBucket(integrationId: string, now: number): AccountBucket {
    let bucket = this.accounts.get(integrationId);
    if (!bucket) {
      bucket = {
        tokens: this.accountBurstMax,
        lastRefillMs: now,
        timestamps: [],
      };
      this.accounts.set(integrationId, bucket);
      return bucket;
    }
    return this.syncExistingBucket(bucket, now);
  }

  private syncExistingBucket(bucket: AccountBucket, now: number): AccountBucket {
    const elapsedMs = Math.max(0, now - bucket.lastRefillMs);
    if (elapsedMs > 0) {
      const refillRatePerMs = this.accountSendsPerMinute / this.windowMs;
      bucket.tokens = Math.min(
        this.accountBurstMax,
        bucket.tokens + elapsedMs * refillRatePerMs
      );
      bucket.lastRefillMs = now;
    }
    const cutoff = now - this.windowMs;
    if (bucket.timestamps.length > 0) {
      bucket.timestamps = bucket.timestamps.filter(ts => ts > cutoff);
    }
    return bucket;
  }
}
