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

    it 'toggles an advanced flag off, on and off again' do
      expect(described_class.states(account)['kalo_help_center']).to be(false)

      described_class.update!(account, %w[kalo_help_center])
      expect(account.reload.feature_enabled?('kalo_help_center')).to be(true)

      described_class.update!(account, [])
      expect(account.reload.feature_enabled?('kalo_help_center')).to be(false)
    end

    it 'saves flags on an account that fails unrelated validations' do
      account.update_column(:name, '') # rubocop:disable Rails/SkipsModelValidations
      expect(account.reload).not_to be_valid

      described_class.update!(account, %w[kalo_pos])

      expect(account.reload.feature_enabled?('kalo_pos')).to be(true)
    end
  end
end
