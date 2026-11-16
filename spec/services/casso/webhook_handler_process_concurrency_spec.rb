# frozen_string_literal: true

require 'rails_helper'

# Not transactional: it needs real concurrent connections, so it creates and removes its own data.
RSpec.describe Casso::WebhookHandler, '#process' do
  self.use_transactional_tests = false

  let!(:account_id) { create(:account, custom_attributes: { 'tenant_slug' => 'conc' }).id }

  after do
    Kchat::PaymentEvent.where(tid: 'CONC1').delete_all
    Account.where(id: account_id).destroy_all
  end

  it 'credits once for concurrent identical tids: the unique index turns the losers into duplicate_ignored' do
    statuses = Queue.new
    threads = Array.new(4) do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          tx = { 'tid' => 'CONC1', 'description' => 'KALO CONC TOKEN 1', 'amount' => 100_000 }
          statuses << described_class.new('data' => [tx]).process[:results].first[:status]
        end
      end
    end
    threads.each(&:join)
    results = Array.new(statuses.size) { statuses.pop }

    expect(results.tally).to eq('matched_and_activated' => 1, 'duplicate_ignored' => 3)
    expect(Account.find(account_id).custom_attributes['ai_tokens_balance']).to eq(100_000)
    expect(Kchat::PaymentEvent.where(tid: 'CONC1').count).to eq(1)
  end
end
