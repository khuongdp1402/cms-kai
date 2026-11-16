// Remembers AI suggestions per conversation and last incoming message, so switching
// conversations or remounting the composer never pays twice for the same message.
const SILENT_MS = 60000;
const MAX_ENTRIES = 200;
const entries = new Map();

export const cacheKey = (conversationId, messageId) =>
  `${conversationId}:${messageId}`;

export const getCachedSuggestion = key => {
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.until && entry.until < Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry;
};

const put = (key, entry) => {
  entries.delete(key);
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
};

export const cacheReply = (key, reply) => put(key, { reply });

// A disabled AI (503) or expired plan (403) is not retried for a minute.
export const cacheSilent = key => put(key, { until: Date.now() + SILENT_MS });

export const clearSuggestionCache = () => entries.clear();
