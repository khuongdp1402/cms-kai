# frozen_string_literal: true

# The AI throttle counter must never touch the shared Redis in specs (parallel runs would hit spurious 429s).
RSpec.configure do |config|
  config.before { Kchat::AiThrottle.store = ActiveSupport::Cache::MemoryStore.new }
  config.after { Kchat::AiThrottle.store = nil }
end
