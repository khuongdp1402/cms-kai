require 'rails_helper'

RSpec.describe Kchat::Features do
  let(:account) { create(:account) }

  describe 'flag definitions' do
    it 'declares every Kalo flag in config/features.yml on the extension column' do
      yml = Featurable::FEATURE_LIST.index_by { |f| f['name'] }
      described_class::ALL.each do |name|
        expect(yml[name]).to include('column' => 'feature_flags_ext_1'), "#{name} missing from features.yml"
      end
    end

    it 'turns core modules on and advanced groups off by default' do
      yml = Featurable::FEATURE_LIST.index_by { |f| f['name'] }
      expect(described_class::CORE.map { |n| yml[n]['enabled'] }).to all(be(true))
      expect(described_class::ADVANCED.map { |n| yml[n]['enabled'] }).to all(be(false))
    end
  end

  describe 'new account defaults' do
    before { ConfigLoader.new.process }

    it 'enables core modules and hides advanced groups for a new shop' do
      states = described_class.states(create(:account))
      expect(states.values_at(*described_class::CORE)).to all(be(true))
      expect(states.values_at(*described_class::ADVANCED)).to all(be(false))
    end
  end

  describe '.states' do
    it 'returns every Kalo flag with a boolean' do
      account.enable_features!('kalo_pos')
      expect(described_class.states(account)).to eq(described_class::ALL.index_with { |n| n == 'kalo_pos' })
    end
  end

  describe '.update!' do
    it 'sets exactly the given Kalo flags and leaves other feature flags untouched' do
      account.enable_features!('help_center', 'kalo_pos', 'kalo_brand')
      described_class.update!(account, %w[kalo_brand kalo_help_center])

      account.reload
      expect(account.feature_enabled?('help_center')).to be(true)
      expect(described_class.states(account).select { |_n, on| on }.keys).to contain_exactly('kalo_brand', 'kalo_help_center')
    end

    it 'rejects unknown names' do
      expect { described_class.update!(account, %w[kalo_brand help_center]) }.to raise_error(ArgumentError, /help_center/)
    end
  end

  describe '.backfill!' do
    it 'turns core modules on and leaves unused advanced groups off' do
      described_class.backfill!(account)
      states = described_class.states(account.reload)
      expect(states.values_at(*described_class::CORE)).to all(be(true))
      expect(states.values_at(*described_class::ADVANCED)).to all(be(false))
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
      setups.each do |label, setup|
        shop = create(:account)
        setup.call(shop)
        described_class.backfill!(shop)
        expect(shop.reload.feature_enabled?('kalo_advanced_automation')).to be(true), "#{label} did not keep the flag"
      end
    end

    it 'keeps help center on when the shop has a portal' do
      create(:portal, account: account)
      described_class.backfill!(account)
      expect(account.reload.feature_enabled?('kalo_help_center')).to be(true)
    end

    it 'keeps extra channels on when the shop has an SMS, email, API (Zalo OA), Telegram, Line or WhatsApp inbox' do
      create(:inbox, account: account, channel: build(:channel_api, account: account))
      described_class.backfill!(account)
      expect(account.reload.feature_enabled?('kalo_extra_channels')).to be(true)
    end

    it 'does not turn extra channels on for website or Zalo personal inboxes' do
      create(:inbox, account: account)
      described_class.backfill!(account)
      expect(account.reload.feature_enabled?('kalo_extra_channels')).to be(false)
    end

    it 'keeps detailed reports on when the shop uses teams or CSAT' do
      create(:team, account: account)
      described_class.backfill!(account)
      expect(account.reload.feature_enabled?('kalo_detailed_reports')).to be(true)
    end

    it 'never turns off a flag that is already on' do
      account.enable_features!('kalo_help_center')
      described_class.backfill!(account)
      expect(account.reload.feature_enabled?('kalo_help_center')).to be(true)
    end
  end
end
