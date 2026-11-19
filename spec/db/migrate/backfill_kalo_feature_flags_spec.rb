require 'rails_helper'
require Rails.root.join('db/migrate/20261119000001_backfill_kalo_feature_flags.rb')

RSpec.describe BackfillKaloFeatureFlags do
  def migrate_up
    ActiveRecord::Migration.suppress_messages { described_class.new.migrate(:up) }
  end

  def enabled_kalo(account)
    Kchat::Features.states(account.reload).select { |_n, on| on }.keys
  end

  it 'freezes the same bit positions as config/features.yml' do
    frozen = described_class::CORE_BITS.transform_keys { |name| :"feature_#{name}" }.merge(
      feature_kalo_advanced_automation: described_class::KALO_ADVANCED_AUTOMATION,
      feature_kalo_help_center: described_class::KALO_HELP_CENTER,
      feature_kalo_detailed_reports: described_class::KALO_DETAILED_REPORTS,
      feature_kalo_extra_channels: described_class::KALO_EXTRA_CHANNELS
    )
    expect(Account.flag_mapping['feature_flags_ext_1'].slice(*frozen.keys)).to eq(frozen)
  end

  it 'turns core modules on and leaves unused advanced groups off' do
    account = create(:account)
    migrate_up
    expect(enabled_kalo(account)).to match_array(Kchat::Features::CORE)
  end

  it 'keeps advanced automation on when the shop has automation rules, macros, bots, webhooks, apps or attributes' do
    setups = {
      automation_rules: ->(shop) { create(:automation_rule, account: shop) },
      macros: ->(shop) { create(:macro, account: shop) },
      webhooks: ->(shop) { create(:webhook, account: shop) },
      dashboard_apps: ->(shop) { create(:dashboard_app, account: shop) },
      custom_attributes: ->(shop) { create(:custom_attribute_definition, account: shop) },
      agent_bots: ->(shop) { create(:agent_bot, account: shop) }
    }
    shops = setups.transform_values { |setup| create(:account).tap { |shop| setup.call(shop) } }
    plain = create(:account)

    migrate_up

    shops.each do |label, shop|
      expect(shop.reload.feature_enabled?('kalo_advanced_automation')).to be(true), "#{label} did not keep the flag"
    end
    expect(plain.reload.feature_enabled?('kalo_advanced_automation')).to be(false)
  end

  it 'keeps help center on for shops with a portal' do
    account = create(:account)
    create(:portal, account: account)
    migrate_up
    expect(account.reload.feature_enabled?('kalo_help_center')).to be(true)
  end

  it 'keeps extra channels on for an API (Zalo OA) inbox but not for a website inbox' do
    api_shop = create(:account)
    create(:inbox, account: api_shop, channel: build(:channel_api, account: api_shop))
    web_shop = create(:account)
    create(:inbox, account: web_shop)

    migrate_up

    expect(api_shop.reload.feature_enabled?('kalo_extra_channels')).to be(true)
    expect(web_shop.reload.feature_enabled?('kalo_extra_channels')).to be(false)
  end

  it 'keeps detailed reports on for shops with teams or a CSAT inbox' do
    team_shop = create(:account)
    create(:team, account: team_shop)
    csat_shop = create(:account)
    create(:inbox, account: csat_shop, csat_survey_enabled: true)

    migrate_up

    expect(team_shop.reload.feature_enabled?('kalo_detailed_reports')).to be(true)
    expect(csat_shop.reload.feature_enabled?('kalo_detailed_reports')).to be(true)
  end

  it 'never turns a flag off and is a no-op when run twice' do
    account = create(:account)
    account.enable_features!('kalo_help_center', 'data_import')
    migrate_up
    first = account.reload.slice(:feature_flags, :feature_flags_ext_1)

    migrate_up

    expect(account.reload.slice(:feature_flags, :feature_flags_ext_1)).to eq(first)
    expect(account.feature_enabled?('kalo_help_center')).to be(true)
    expect(account.feature_enabled?('data_import')).to be(true)
  end
end
