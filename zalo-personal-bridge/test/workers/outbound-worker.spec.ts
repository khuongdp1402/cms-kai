import { describe, it, expect, vi } from 'vitest';
import { OutboundWorker } from '../../src/workers/outbound-worker.js';
import { SendRateLimiter } from '../../src/workers/rate-limiter.js';

const makeRow = (deliveryId: string, integrationId: string) => ({
  delivery_id: deliveryId,
  integration_id: integrationId,
  fencing_token: 1,
  payload: {
    message: {
      text: `msg-${deliveryId}`,
      attachments: [],
    },
  },
});

describe('OutboundWorker rate limiting', () => {
  it('leaves throttled integration rows queued while allowing other integrations in the same batch to send', async () => {
    const rows = [
      makeRow('a-1', 'int-a'),
      makeRow('a-2', 'int-a'),
      makeRow('a-3', 'int-a'),
      makeRow('b-1', 'int-b'),
    ];
    const queries: Array<{ sql: string; params?: any[] }> = [];
    const db = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT d.delivery_id')) {
          return { rows };
        }
        return { rows: [] };
      }),
    } as any;

    const sendSpy = vi.fn(async () => ({
      success: true,
      providerMessageIds: ['ext-1'],
    }));
    const sessionManager = {
      getRuntime: vi.fn(() => ({ session: { send: sendSpy } })),
    } as any;

    const rateLimiter = new SendRateLimiter({
      accountBurstMax: 2,
      accountSendsPerMinute: 2,
      globalSendsPerMinute: 10,
    });
    const worker = new OutboundWorker(db, sessionManager, 'pod-1', rateLimiter);

    await worker.processQueue();

    expect(sendSpy).toHaveBeenCalledTimes(3);
    const sentTexts = sendSpy.mock.calls.map((c: any[]) => c[0].message.text);
    expect(sentTexts).toEqual(['msg-a-1', 'msg-a-2', 'msg-b-1']);

    // Delivery a-3 must not transition to processing or increment attempts
    const processingUpdates = queries
      .filter(q => q.sql.includes("status = 'processing'"))
      .map(q => q.params?.[0]);
    expect(processingUpdates).toEqual(['a-1', 'a-2', 'b-1']);
    expect(processingUpdates).not.toContain('a-3');
  });

  it('skips polling database when global pod rate limit is exhausted', async () => {
    const db = { query: vi.fn() } as any;
    const sessionManager = { getRuntime: vi.fn() } as any;
    const rateLimiter = new SendRateLimiter({
      accountBurstMax: 5,
      accountSendsPerMinute: 5,
      globalSendsPerMinute: 1,
    });
    rateLimiter.tryAcquire('int-a');

    const worker = new OutboundWorker(db, sessionManager, 'pod-1', rateLimiter);
    await worker.processQueue();

    expect(db.query).not.toHaveBeenCalled();
  });
});
