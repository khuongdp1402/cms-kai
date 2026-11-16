# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Casso::WebhookHandler do
  let!(:account_hana) { create(:account, name: 'hana', custom_attributes: { 'tenant_slug' => 'hana' }) }

  def run(description:, amount:, tid: "FT#{SecureRandom.hex(4)}")
    described_class.new('data' => [{ 'tid' => tid, 'description' => description, 'amount' => amount }]).process[:results].first
  end

  it 'activates the plan matching the paid amount and extends 30 days' do
    result = run(description: 'KALO HANA 9812', amount: 699_000)

    expect(result[:status]).to eq('matched_and_activated')
    attrs = account_hana.reload.custom_attributes
    expect(attrs['subscription_plan']).to eq('growth')
    expect(Time.zone.parse(attrs['subscription_valid_until'])).to be_within(1.minute).of(30.days.from_now)
  end

  it 'matches by numeric account id' do
    result = run(description: "KALO #{account_hana.id} 77", amount: 299_000)

    expect(result[:account_id]).to eq(account_hana.id)
    expect(account_hana.reload.custom_attributes['subscription_plan']).to eq('starter')
  end

  it 'does not activate a plan when the transfer is below the cheapest plan' do
    result = run(description: 'KALO HANA 9812', amount: 200_000)

    expect(result[:status]).to eq('underpaid_recorded')
    attrs = account_hana.reload.custom_attributes
    expect(attrs['subscription_status']).to be_nil
    expect(attrs['pending_underpaid_amount']).to eq(200_000)
  end

  it 'credits AI tokens equal to the amount for TOKEN orders' do
    run(description: 'KALO HANA TOKEN 5511', amount: 100_000)

    expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(100_000)
  end

  it 'stores every transaction as a PaymentEvent, including unmatched and underpaid' do
    run(description: 'KALO HANA 1', amount: 699_000, tid: 'E1')
    run(description: 'KALO HANA 2', amount: 100_000, tid: 'E2')
    run(description: 'KALO NOBODY 3', amount: 50_000, tid: 'E3')
    run(description: 'random words', amount: 70_000, tid: 'E4')

    events = Kchat::PaymentEvent.order(:tid).index_by(&:tid)
    expect(events.transform_values(&:status)).to eq('E1' => 'matched', 'E2' => 'underpaid', 'E3' => 'unmatched', 'E4' => 'unmatched')
    expect(events['E1']).to have_attributes(account_id: account_hana.id, amount: 699_000, description: 'KALO HANA 1')
    expect(events['E3'].account_id).to be_nil
  end

  it 'does not store a transaction without tid or amount' do
    result = run(description: 'KALO HANA 1', amount: 0, tid: 'Z1')

    expect(result[:status]).to eq('invalid_transaction')
    expect(Kchat::PaymentEvent.count).to eq(0)
  end

  it 'no longer keeps processed tids on the account' do
    run(description: 'KALO HANA TOKEN 1', amount: 1000, tid: 'FT5')

    expect(account_hana.reload.custom_attributes).not_to have_key('processed_casso_tids')
  end

  it 'ignores a duplicate tid' do
    run(description: 'KALO HANA TOKEN 5511', amount: 100_000, tid: 'FT1')
    second = run(description: 'KALO HANA TOKEN 5511', amount: 100_000, tid: 'FT1')

    expect(second[:status]).to eq('duplicate_ignored')
    expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(100_000)
  end

  it 'rolls back the event when crediting fails so a retry can still credit' do
    allow_any_instance_of(Account).to receive(:update!).and_raise(ActiveRecord::StatementInvalid, 'boom') # rubocop:disable RSpec/AnyInstance
    expect { run(description: 'KALO HANA TOKEN 1', amount: 1000, tid: 'FT6') }.to raise_error(ActiveRecord::StatementInvalid)
    expect(Kchat::PaymentEvent.where(tid: 'FT6')).to be_empty
  end

  it 'never matches by account name' do
    named_only = create(:account, name: 'shopabc')
    result = run(description: 'KALO SHOPABC 1234', amount: 699_000)

    expect(result[:status]).to eq('unmatched_account_recorded')
    expect(named_only.reload.custom_attributes['subscription_status']).to be_nil
  end
end
