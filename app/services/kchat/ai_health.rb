# frozen_string_literal: true

# Remembers the last AI provider failure for the whole installation, so /brand_growth/ai_health can say
# "configured but not answering" (e.g. a revoked key that makes every call 502) instead of a cheerful "configured".
# Production uses the Rack::Attack cache store (shared Redis, same answer in every process). Specs inject a MemoryStore.
module Kchat::AiHealth
  KEY = 'kalo:ai:last_provider_failure'
  FAILURE_TTL = 5.minutes

  class << self
    attr_writer :store

    def store
      @store || Rack::Attack.cache.store
    end

    def record_failure!
      store.write(KEY, Time.current.iso8601, expires_in: FAILURE_TTL)
    end

    def clear_failure!
      store.delete(KEY)
    end

    # ISO 8601 time of the last failure within FAILURE_TTL, or nil.
    def last_failure_at
      store.read(KEY)
    end
  end
end
