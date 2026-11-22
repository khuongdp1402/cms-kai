# frozen_string_literal: true

# Kalo feature groups (ADR-023), stored as Chatwoot account feature flags (`config/features.yml`,
# column `feature_flags_ext_1`). Hiding is presentation-level: the dashboard reads them from the
# account payload `features`; backend APIs of a hidden group keep working.
# Existing accounts were backfilled by migration 20261119000001_backfill_kalo_feature_flags.
module Kchat::Features
  # On for new shops.
  CORE = %w[kalo_comments kalo_campaigns kalo_brand kalo_ai_assistant].freeze
  # Off for new shops; a Super Admin turns them on per shop.
  ADVANCED = %w[kalo_pos kalo_advanced_automation kalo_help_center kalo_detailed_reports kalo_extra_channels].freeze
  ALL = (CORE + ADVANCED).freeze

  module_function

  def states(account)
    ALL.index_with { |name| account.feature_enabled?(name) }
  end

  # Turns on exactly `enabled_names` among the Kalo flags; other feature flags are left alone.
  # Writes only the flag column, so an account failing unrelated validations can still be toggled.
  def update!(account, enabled_names)
    enabled = Array(enabled_names).map(&:to_s)
    unknown = enabled - ALL
    raise ArgumentError, "Unknown Kalo feature: #{unknown.join(', ')}" if unknown.any?

    account.enable_features(*enabled)
    account.disable_features(*(ALL - enabled))
    account.update_columns(feature_flags_ext_1: account.feature_flags_ext_1, updated_at: Time.current) # rubocop:disable Rails/SkipsModelValidations
  end
end
