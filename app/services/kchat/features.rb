# frozen_string_literal: true

# Kalo feature groups (ADR-023), stored as Chatwoot account feature flags (`config/features.yml`,
# column `feature_flags_ext_1`). Hiding is presentation-level: the dashboard reads them from the
# account payload `features`; backend APIs of a hidden group keep working.
module Kchat::Features
  # On for new shops.
  CORE = %w[kalo_comments kalo_campaigns kalo_brand kalo_ai_assistant kalo_pos].freeze
  # Off for new shops; a Super Admin turns them on per shop.
  ADVANCED = %w[kalo_advanced_automation kalo_help_center kalo_detailed_reports kalo_extra_channels].freeze
  ALL = (CORE + ADVANCED).freeze

  # Zalo OA (token) inboxes are Channel::Api with additional_attributes channel 'zalo'.
  EXTRA_CHANNEL_TYPES = %w[Channel::Sms Channel::TwilioSms Channel::Email Channel::Api Channel::Telegram Channel::Line Channel::Whatsapp].freeze

  module_function

  def states(account)
    ALL.index_with { |name| account.feature_enabled?(name) }
  end

  # Turns on exactly `enabled_names` among the Kalo flags; other feature flags are left alone.
  def update!(account, enabled_names)
    enabled = Array(enabled_names).map(&:to_s)
    unknown = enabled - ALL
    raise ArgumentError, "Unknown Kalo feature: #{unknown.join(', ')}" if unknown.any?

    account.enable_features(*enabled)
    account.disable_features(*(ALL - enabled))
    account.save!
  end

  # For shops created before the flags existed: core modules on, and every advanced group the shop
  # already uses stays visible. Never turns a flag off. Writes only the flag column (no validations or
  # callbacks) so it is safe to run over every existing account from a migration.
  def backfill!(account)
    account.enable_features(*CORE, *advanced_in_use(account))
    account.update_columns(feature_flags_ext_1: account.feature_flags_ext_1) # rubocop:disable Rails/SkipsModelValidations
  end

  def advanced_in_use(account)
    {
      'kalo_advanced_automation' => uses_advanced_automation?(account),
      'kalo_help_center' => account.portals.exists?,
      'kalo_detailed_reports' => uses_detailed_reports?(account),
      'kalo_extra_channels' => account.inboxes.exists?(channel_type: EXTRA_CHANNEL_TYPES)
    }.select { |_name, used| used }.keys
  end

  def uses_advanced_automation?(account)
    %i[automation_rules macros custom_attribute_definitions agent_bots agent_bot_inboxes webhooks dashboard_apps]
      .any? { |association| account.public_send(association).exists? }
  end

  def uses_detailed_reports?(account)
    account.teams.exists? || account.inboxes.exists?(csat_survey_enabled: true) || account.csat_survey_responses.exists?
  end
end
