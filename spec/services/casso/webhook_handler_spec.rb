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

  describe 'description matching' do
    {
      'KALO 12 PLAN' => ['12', 'PLAN', nil],
      'MBVCB.123.KALO 12 PLAN.CT tu NGUYEN VAN A' => ['12', 'PLAN', nil],
      'KALO 12 PLAN 9812' => %w[12 PLAN 9812],
      'KALO HANA TOKEN 55' => %w[HANA TOKEN 55],
      'KALO 12 9812' => %w[12 PLAN 9812],
      'kalo 12 plan' => ['12', 'PLAN', nil],
      'KALO 12' => ['12', 'PLAN', nil]
    }.each do |text, (ref, type, order_id)|
      it "matches #{text.inspect}" do
        match = text.match(described_class::DESCRIPTION_PATTERN)
        expect([match[1], (match[2] || 'PLAN').upcase, match[3]]).to eq([ref, type, order_id])
        expect(described_class.parse_description(text)).to eq(order_type: type, order_id: order_id)
      end
    end

    ['KALOX 12 PLAN', 'XKALO 12 PLAN', 'KALO'].each do |text|
      it "does not match #{text.inspect}" do
        expect(text).not_to match(described_class::DESCRIPTION_PATTERN)
      end
    end

    it 'credits an account for a bank-wrapped memo without an order id' do
      result = run(description: "MBVCB.123.KALO #{account_hana.id} PLAN.CT tu A", amount: 299_000)

      expect(result).to include(status: 'matched_and_activated', account_id: account_hana.id, order_id: nil)
      expect(account_hana.reload.custom_attributes['subscription_plan']).to eq('starter')
    end
  end

  describe 'malformed input' do
    it 'does not abort the batch on a bad date or a non-hash entry' do
      batch = [
        { 'tid' => 'B1', 'description' => 'KALO HANA TOKEN 1', 'amount' => 1000, 'when' => '2026-13-45' },
        'garbage',
        42,
        { 'tid' => 'B2', 'description' => 'KALO HANA TOKEN 2', 'amount' => 2000 }
      ]
      results = described_class.new('data' => batch).process[:results]

      expect(results.pluck(:status)).to eq(%w[matched_and_activated invalid_transaction invalid_transaction matched_and_activated])
      expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(3000)
      expect(Kchat::PaymentEvent.find_by(tid: 'B1').received_at).to be_within(1.minute).of(Time.current)
    end

    it 'reads the Casso `when` as Vietnam local time' do
      described_class.new('data' => [{ 'tid' => 'V1', 'description' => 'KALO HANA TOKEN 1', 'amount' => 1000,
                                       'when' => '2026-11-16 00:30:00' }]).process

      expect(Kchat::PaymentEvent.find_by(tid: 'V1').received_at.utc.iso8601).to eq('2026-11-15T17:30:00Z')
    end
  end

  describe 'slugs with punctuation and inexact keywords' do
    let!(:shop) { create(:account, custom_attributes: { 'tenant_slug' => 'hana-shop' }) }
    let!(:snake) { create(:account, custom_attributes: { 'tenant_slug' => 'hana_shop' }) }

    it 'credits the tenant named by a dashed or underscored slug, not the shorter one' do
      expect(run(description: 'KALO hana-shop PLAN 9', amount: 299_000)).to include(account_id: shop.id, order_type: 'PLAN')
      expect(run(description: 'KALO HANA_SHOP TOKEN', amount: 50_000)).to include(account_id: snake.id, order_type: 'TOKEN')
      expect(run(description: 'KALO hana-shop TOKEN 7', amount: 10_000)).to include(account_id: shop.id, order_type: 'TOKEN')

      expect(shop.reload.custom_attributes).to include('subscription_plan' => 'starter', 'ai_tokens_balance' => 10_000)
      expect(snake.reload.custom_attributes['ai_tokens_balance']).to eq(50_000)
      expect(account_hana.reload.custom_attributes).not_to include('subscription_plan', 'ai_tokens_balance')
    end

    it 'fails closed when the reference runs into the keyword' do
      result = run(description: 'KALO 12-PLAN', amount: 299_000)

      expect(result[:status]).to eq('unmatched_account_recorded')
      expect(Kchat::PaymentEvent.last.status).to eq('unmatched')
    end

    %w[TOKENS SEEDS PLANS Tokenx].each do |word|
      it "records KALO <id> #{word} as unmatched instead of defaulting to a plan" do
        result = run(description: "KALO #{account_hana.id} #{word} 5", amount: 699_000)

        expect(result[:status]).to eq('unmatched_account_recorded')
        expect(account_hana.reload.custom_attributes).not_to include('subscription_plan', 'ai_tokens_balance')
        expect(Kchat::PaymentEvent.last.status).to eq('unmatched')
      end
    end

    it 'keeps other trailing words as a default plan for the reference' do
      expect(run(description: "KALO #{account_hana.id} FT2611123", amount: 299_000)).to include(status: 'matched_and_activated', order_type: 'PLAN')
    end

    it 'has no order type for an inexact keyword when parsing for manual assignment' do
      expect(described_class.parse_description('KALO 12 TOKENS 5')).to eq(order_type: nil, order_id: nil)
    end
  end

  it 'treats a non-numeric amount as an invalid transaction without aborting the batch' do
    batch = [{ 'tid' => 'A1', 'description' => 'KALO HANA TOKEN 1', 'amount' => { 'x' => 1 } },
             { 'tid' => 'A2', 'description' => 'KALO HANA TOKEN 1', 'amount' => [5] },
             { 'tid' => 'A3', 'description' => 'KALO HANA TOKEN 1', 'amount' => 'abc' },
             { 'tid' => 'A4', 'description' => 'KALO HANA TOKEN 1', 'amount' => '1000' }]
    results = described_class.new('data' => batch).process[:results]

    expect(results.pluck(:status)).to eq(%w[invalid_transaction invalid_transaction invalid_transaction matched_and_activated])
    expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(1000)
  end

  describe 'payload shapes' do
    let(:tx) { { 'tid' => 'S1', 'description' => 'KALO HANA TOKEN 1', 'amount' => 1000 } }

    it 'accepts `data` as an array of transactions' do
      handler = described_class.new('data' => [tx, tx.merge('tid' => 'S2')])

      expect(handler).to be_valid_payload
      expect(handler.process[:results].pluck(:status)).to eq(%w[matched_and_activated matched_and_activated])
    end

    it 'accepts `data` as a single transaction object (Casso webhook v2)' do
      handler = described_class.new('data' => tx)

      expect(handler).to be_valid_payload
      expect(handler.process[:results].pluck(:status)).to eq(%w[matched_and_activated])
      expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to eq(1000)
    end

    it 'accepts a top-level transaction with `tid` and `amount` and no `data`' do
      handler = described_class.new(tx)

      expect(handler).to be_valid_payload
      expect(handler.process[:results].pluck(:status)).to eq(%w[matched_and_activated])
    end

    it 'accepts a top-level transaction identified by `id`' do
      handler = described_class.new('id' => 77, 'description' => 'KALO HANA TOKEN 1', 'amount' => 500)

      expect(handler).to be_valid_payload
      expect(handler.process[:results].first[:tid]).to eq('77')
    end

    it 'accepts an empty `data` array as a valid payload with nothing to process' do
      handler = described_class.new('data' => [])

      expect(handler).to be_valid_payload
      expect(handler.process[:processed_count]).to eq(0)
    end

    [
      ['no data and no transaction fields', {}],
      ['null data', { 'data' => nil }],
      ['string data', { 'data' => 'oops' }],
      ['number data', { 'data' => 5 }],
      ['top-level object without amount', { 'tid' => 'X1' }],
      ['top-level object without tid or id', { 'amount' => 1000 }]
    ].each do |label, payload|
      it "marks #{label} as an invalid payload" do
        expect(described_class.new(payload)).not_to be_valid_payload
      end
    end
  end

  describe 'tenant_slug collisions' do
    it 'treats a transaction as unmatched when two accounts share the slug (case-insensitive)' do
      twin = create(:account, name: 'twin', custom_attributes: { 'tenant_slug' => 'HANA' })

      result = run(description: 'KALO HANA TOKEN 1', amount: 5000)

      expect(result[:status]).to eq('unmatched_account_recorded')
      expect(result).not_to have_key(:account_id)
      expect(account_hana.reload.custom_attributes['ai_tokens_balance']).to be_nil
      expect(twin.reload.custom_attributes['ai_tokens_balance']).to be_nil
      expect(Kchat::PaymentEvent.last.account_id).to be_nil
    end

    it 'still matches a unique slug regardless of case' do
      expect(run(description: 'KALO Hana TOKEN 1', amount: 5000)[:account_id]).to eq(account_hana.id)
    end
  end

  describe 'a corrupt stored subscription_valid_until' do
    [['unparseable string', 'garbage'], ['number', 20_261_231], ['array', ['x']],
     ['partial day number', '5'], ['date only', '2026-12-01']].each do |label, bad|
      it "still credits a plan payment starting from now when the stored value is a #{label}" do
        account_hana.update!(custom_attributes: account_hana.custom_attributes.merge('subscription_valid_until' => bad))
        allow(Rails.logger).to receive(:warn)

        result = run(description: 'KALO HANA 1', amount: 299_000)

        expect(result[:status]).to eq('matched_and_activated')
        attrs = account_hana.reload.custom_attributes
        expect(attrs['subscription_plan']).to eq('starter')
        expect(Time.zone.parse(attrs['subscription_valid_until'])).to be_within(1.minute).of(30.days.from_now)
        expect(Rails.logger).to have_received(:warn).with(satisfy { |m| m.include?('[Casso]') && m.exclude?('garbage') })
      end
    end

    it 'extends from a valid stored ISO timestamp with an offset' do
      until_time = 10.days.from_now.in_time_zone('Asia/Ho_Chi_Minh')
      account_hana.update!(custom_attributes: account_hana.custom_attributes.merge('subscription_valid_until' => until_time.iso8601))

      run(description: 'KALO HANA 1', amount: 299_000)

      expect(Time.zone.parse(account_hana.reload.custom_attributes['subscription_valid_until'])).to be_within(1.minute).of(40.days.from_now)
    end
  end
end
