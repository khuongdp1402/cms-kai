# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Kchat::Entitlements do
  def account_created(days_ago, attrs = {})
    create(:account, created_at: days_ago.days.ago, custom_attributes: attrs)
  end

  it 'trial for 14 days, then expired without payment, active with future valid_until' do
    expect(described_class.status(account_created(0))).to eq(:trial)
    expect(described_class.status(account_created(13))).to eq(:trial)
    expect(described_class.status(account_created(15))).to eq(:expired)
    expect(described_class.status(account_created(15, 'subscription_valid_until' => 2.days.from_now.iso8601))).to eq(:active)
    expect(described_class.status(account_created(1, 'subscription_valid_until' => 2.days.from_now.iso8601))).to eq(:active)
    expect(described_class.status(account_created(40, 'subscription_valid_until' => 2.days.ago.iso8601))).to eq(:expired)
  end

  it 'require_active! raises Expired only when expired' do
    expect { described_class.require_active!(account_created(1)) }.not_to raise_error
    expect { described_class.require_active!(account_created(20)) }.to raise_error(described_class::Expired)
  end

  it 'valid_until is the trial end during trial and days_left rounds up' do
    account = account_created(10)
    expect(described_class.valid_until(account)).to be_within(1.minute).of(account.created_at + 14.days)
    expect(described_class.days_left(account)).to eq(4)
    expect(described_class.days_left(account_created(30))).to eq(0)
  end
end
