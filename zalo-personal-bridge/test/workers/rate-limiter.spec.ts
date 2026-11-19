import { describe, it, expect } from 'vitest';
import { SendRateLimiter } from '../../src/workers/rate-limiter.js';

describe('SendRateLimiter', () => {
  it('allows immediate burst up to ACCOUNT_BURST_MAX (10) and blocks the 11th until refill (~2s)', () => {
    const limiter = new SendRateLimiter();
    const t0 = 1_000_000;

    for (let i = 0; i < 10; i += 1) {
      expect(limiter.tryAcquire('shop-a', t0)).toBe(true);
    }
    expect(limiter.canSend('shop-a', t0)).toBe(false);
    expect(limiter.tryAcquire('shop-a', t0 + 1_000)).toBe(false);

    // At 30 sends/min (1 token per 2,000ms), 1 token refills after 2,000ms.
    expect(limiter.canSend('shop-a', t0 + 2_000)).toBe(true);
    expect(limiter.tryAcquire('shop-a', t0 + 2_000)).toBe(true);
    expect(limiter.tryAcquire('shop-a', t0 + 2_000)).toBe(false);
  });

  it('caps sustained per-account sends at ACCOUNT_SENDS_PER_MINUTE (30) within 60s', () => {
    const limiter = new SendRateLimiter();
    let now = 1_000_000;

    let sent = 0;
    // Send 10 burst at t0, then 1 every 2,000ms up to +58s => total 30 sends inside 60s window
    for (let i = 0; i < 10; i += 1) {
      if (limiter.tryAcquire('shop-a', now)) sent += 1;
    }
    for (let step = 1; step <= 25; step += 1) {
      now += 2_000;
      if (limiter.tryAcquire('shop-a', now)) sent += 1;
    }
    expect(sent).toBe(30);
    // Token bucket may refill after 2s, but sliding window still holds 30 events inside [now-60s, now]
    expect(limiter.canSend('shop-a', now + 2_000)).toBe(false);

    // Once earliest sends fall outside 60,000ms window, sending resumes
    expect(limiter.canSend('shop-a', 1_060_000)).toBe(true);
  });

  it('enforces GLOBAL_SENDS_PER_MINUTE (150) across multiple integrations', () => {
    const limiter = new SendRateLimiter();
    const t0 = 2_000_000;

    for (let acc = 0; acc < 15; acc += 1) {
      for (let i = 0; i < 10; i += 1) {
        expect(limiter.tryAcquire(`shop-${acc}`, t0)).toBe(true);
      }
    }

    expect(limiter.canSendGlobal(t0)).toBe(false);
    expect(limiter.tryAcquire('shop-fresh', t0)).toBe(false);
    expect(limiter.blockedIntegrationIds(['shop-0', 'shop-fresh', 'shop-0'], t0)).toEqual([
      'shop-0',
      'shop-fresh',
    ]);

    expect(limiter.canSendGlobal(t0 + 60_000)).toBe(true);
    expect(limiter.tryAcquire('shop-fresh', t0 + 60_000)).toBe(true);
  });
});
