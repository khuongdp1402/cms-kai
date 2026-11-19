# Kalo feature groups (ADR-023): accounts created before the flags existed get the core modules on
# and keep every advanced group they already use. New accounts get defaults from config/features.yml.
# Self-contained on purpose: bit positions of `feature_flags_ext_1` are frozen here (positional, see
# LESSONS B65) and only SQL is used, so later model changes cannot break this migration.
# Only ORs bits in: running it twice is a no-op and no flag is ever turned off.
class BackfillKaloFeatureFlags < ActiveRecord::Migration[7.1]
  CORE_BITS = {
    kalo_comments: 1 << 6,
    kalo_campaigns: 1 << 7,
    kalo_brand: 1 << 8,
    kalo_ai_assistant: 1 << 9,
    kalo_pos: 1 << 10
  }.freeze

  KALO_ADVANCED_AUTOMATION = 1 << 11
  KALO_HELP_CENTER = 1 << 12
  KALO_DETAILED_REPORTS = 1 << 13
  KALO_EXTRA_CHANNELS = 1 << 14

  # Zalo OA (token) inboxes are Channel::Api.
  EXTRA_CHANNEL_TYPES = %w[Channel::Sms Channel::TwilioSms Channel::Email Channel::Api Channel::Telegram Channel::Line Channel::Whatsapp].freeze

  def up
    execute("UPDATE accounts SET feature_flags_ext_1 = feature_flags_ext_1 | #{CORE_BITS.values.sum}")
    advanced_rules.each do |bit, condition|
      execute("UPDATE accounts SET feature_flags_ext_1 = feature_flags_ext_1 | #{bit} WHERE (#{condition})")
    end
  end

  def down
    # Flags are additive and harmless to keep.
  end

  private

  def advanced_rules
    channel_types = EXTRA_CHANNEL_TYPES.map { |type| connection.quote(type) }.join(', ')
    {
      KALO_ADVANCED_AUTOMATION => any_row(*%w[automation_rules macros custom_attribute_definitions agent_bots agent_bot_inboxes webhooks
                                              dashboard_apps]),
      KALO_HELP_CENTER => any_row('portals'),
      KALO_DETAILED_REPORTS => "#{any_row('teams', 'csat_survey_responses')} OR " \
                               'EXISTS (SELECT 1 FROM inboxes i WHERE i.account_id = accounts.id AND i.csat_survey_enabled)',
      KALO_EXTRA_CHANNELS => "EXISTS (SELECT 1 FROM inboxes i WHERE i.account_id = accounts.id AND i.channel_type IN (#{channel_types}))"
    }
  end

  def any_row(*tables)
    tables.map { |table| "EXISTS (SELECT 1 FROM #{table} t WHERE t.account_id = accounts.id)" }.join(' OR ')
  end
end
