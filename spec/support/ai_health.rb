# frozen_string_literal: true

# The AI provider health flag must never touch the shared Redis in specs (parallel runs would see each other's failures).
RSpec.configure do |config|
  config.before { Kchat::AiHealth.store = ActiveSupport::Cache::MemoryStore.new }
  config.after { Kchat::AiHealth.store = nil }
end
