import { Redis } from 'ioredis';

export class ReplayGuard {
  constructor(private redis: Redis) {}

  async checkAndSaveNonce(nonce: string, ttlSeconds = 300): Promise<boolean> {
    const key = `zalo_bridge:nonce:${nonce}`;
    // SET NX returns 'OK' if key was set, or null if key already existed
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
