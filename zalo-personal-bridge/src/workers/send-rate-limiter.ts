// zalo-personal-bridge/src/workers/send-rate-limiter.ts
//
// KChat P1-09: Rate limiter cho outbound messages từ Zalo Personal Bridge.
// Mục đích: tránh bị Zalo phát hiện và block account do gửi quá nhiều tin nhắn.
//
// Strategy:
// - Mỗi account (Zalo login session) có bucket riêng biệt.
// - Sliding window 60 giây, tối đa MAX_MESSAGES_PER_MINUTE messages.
// - Nếu vượt limit: queue message lại và retry sau khoảng lặng ngẫu nhiên.
// - Log cảnh báo khi Zalo trả lỗi bất thường (429, -216, FLOOD_WAIT).

import { logger } from '../telemetry/logger.js';

const MAX_MESSAGES_PER_MINUTE = parseInt(process.env.ZALO_MAX_MSGS_PER_MINUTE ?? '20', 10);
const WINDOW_MS = 60_000;
// Jitter: ngẫu nhiên thêm 0–2000ms giữa các tin nhắn để tránh pattern đều đặn
const BASE_DELAY_MS = parseInt(process.env.ZALO_MSG_BASE_DELAY_MS ?? '800', 10);
const JITTER_MAX_MS = parseInt(process.env.ZALO_MSG_JITTER_MS ?? '2000', 10);

interface MessageRecord {
  sentAt: number;
}

const accountBuckets = new Map<string, MessageRecord[]>();

function getJitter(): number {
  return Math.floor(Math.random() * JITTER_MAX_MS);
}

function getWindowMessages(accountId: string): MessageRecord[] {
  const now = Date.now();
  const records = (accountBuckets.get(accountId) ?? []).filter(r => now - r.sentAt < WINDOW_MS);
  accountBuckets.set(accountId, records);
  return records;
}

/**
 * Kiểm tra xem có thể gửi ngay không. Nếu có, ghi nhận và trả về 0.
 * Nếu không, trả về milliseconds cần chờ.
 */
export function checkAndRecord(accountId: string): number {
  const records = getWindowMessages(accountId);
  if (records.length >= MAX_MESSAGES_PER_MINUTE) {
    const oldest = records[0].sentAt;
    const waitMs = WINDOW_MS - (Date.now() - oldest) + BASE_DELAY_MS + getJitter();
    logger.warn({ accountId, queueSize: records.length, waitMs }, 'ZaloRateLimiter: rate limit reached, throttling');
    return waitMs;
  }
  records.push({ sentAt: Date.now() });
  accountBuckets.set(accountId, records);
  return 0;
}

/**
 * Bọc một hàm gửi tin nhắn với rate limit + retry + jitter.
 * @param accountId - ID duy nhất của Zalo session/account
 * @param sendFn - Hàm async thực sự gửi tin nhắn
 */
export async function rateLimitedSend(accountId: string, sendFn: () => Promise<unknown>): Promise<unknown> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    const waitMs = checkAndRecord(accountId);
    if (waitMs > 0) {
      logger.info({ accountId, waitMs, attempt }, 'ZaloRateLimiter: waiting before send');
      await new Promise(r => setTimeout(r, waitMs));
    }

    try {
      const result = await sendFn();
      return result;
    } catch (err: unknown) {
      attempt++;
      const errMsg = err instanceof Error ? err.message : String(err);

      // Phát hiện lỗi Zalo "flood" / rate limit
      const isZaloFlood = /(-216|flood|too many|rate|spam)/i.test(errMsg);
      if (isZaloFlood) {
        const backoff = (BASE_DELAY_MS * 2 ** attempt) + getJitter();
        logger.warn({ accountId, attempt, backoff, errMsg }, 'ZaloRateLimiter: Zalo flood error detected, backing off');
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      // Lỗi khác thì throw ngay
      throw err;
    }
  }

  throw new Error(`ZaloRateLimiter: max attempts (${maxAttempts}) exceeded for account ${accountId}`);
}
