# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Casso::WebhookHandler do
  let!(:account_hana) { create(:account, name: 'hana', custom_attributes: { 'tenant_slug' => 'hana' }) }

  def run(description:, amount:, tid: "FT#{SecureRandom.hex(4)}")
    described_class.new('data' => [{ 'tid' => tid, 'description' => description, 'amount' => amount }]).process[:results].first
  end

  it 'activates the plan matching the paid amount and extends 30 days' do
    result = run(description: 'KCHAT HANA 9812', amount: 699_000)

    expect(result[:status]).to eq('matched_and_activated')
    attrs = account_hana.reload.custom_attributes
    expect(attrs['subscription_plan']).to eq('growth')
    expect(Time.zone.parse(attrs['subscription_valid_until'])).to be_within(1.minute).of(30.days.from_now)
  end

  it 'matches by numeric account id' do
    result = run(description: "KCHAT #{account_hana.id} 77", amount: 299_000)

    expect(result[:account_id]).to eq(account_hana.id)
    expect(account_hana.reload.custom_attributes['subscription_plan']).to eq('starter')
  end

  it 'does not activate a plan when the transfer is below the cheapest plan' do
    result = run(description: 'KCHAT HANA 9812', amount: 200_000)

    expect(result[:status]).to eq('underpaid_recorded')
    attrs = account_hana.reload.custom_attributes
    expect(attrs['subscription_status']).to be_nil
    expect(attrs['pending_underpaid_amount']).to eq(200_000)
  end

  it 'credits AI tokens equal to the amount for TOKEN orders' do
    run(description: 'KCHAT HANA TOKEN 5511', amount: 100_000)

    expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(100_000)
  end

  it 'ignores a duplicate tid' do
    run(description: 'KCHAT HANA TOKEN 5511', amount: 100_000, tid: 'FT1')
    second = run(description: 'KCHAT HANA TOKEN 5511', amount: 100_000, tid: 'FT1')

    expect(second[:status]).to eq('duplicate_ignored')
    expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(100_000)
  end

  it 'never matches by account name' do
    named_only = create(:account, name: 'shopabc')
    result = run(description: 'KCHAT SHOPABC 1234', amount: 699_000)

    expect(result[:status]).to eq('unmatched_account_recorded')
    expect(named_only.reload.custom_attributes['subscription_status']).to be_nil
  end
end
