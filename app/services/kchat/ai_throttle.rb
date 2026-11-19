# frozen_string_literal: true

# Counter store behind the per-account AI rate limits enforced in Api::V1::Accounts::BrandGrowthController
# and Api::V1::Accounts::Kchat::AssistantController (each uses its own key prefix).
# Production uses the Rack::Attack cache store (shared Redis, so the count is the same across processes).
# The store is injectable: specs install a private MemoryStore so they never touch the shared Redis.
module Kchat::AiThrottle
  class << self
    attr_reader :store_override

    def store=(store)
      @store_override = store
      @cache = nil
    end

    def store
      @store_override || Rack::Attack.cache.store
    end

    # Number of hits for `key` in the current `period` window, including this one.
    def count(key, period)
      @cache ||= Rack::Attack::Cache.new.tap { |cache| cache.store = store }
      @cache.count(key, period)
    end
  end
end
