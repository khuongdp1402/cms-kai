# frozen_string_literal: true

require 'rails_helper'

# Not transactional: it needs two real connections, so it creates and removes its own data.
RSpec.describe Kchat::PaymentSettings, '.update! concurrency' do
  self.use_transactional_tests = false

  let!(:account_id) { create(:account, custom_attributes: { 'tenant_slug' => 'psconc' }).id }
  let(:bank) { { 'bank_bin' => '970422', 'bank_name' => 'MB', 'account_number' => '0123456789', 'account_name' => 'HANA' } }

  after do
    Kchat::PaymentEvent.where(tid: 'PSCONC1').delete_all
    Account.where(id: account_id).destroy_all
  end

  it 'does not erase a subscription credit written by another connection after the account was loaded' do
    loaded = Queue.new
    resume = Queue.new
    saver = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        stale = Account.find(account_id)
        loaded << true
        resume.pop
        described_class.update!(stale, bank)
      end
    end
    loaded.pop
    Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        Casso::WebhookHandler.apply_payment(Account.find(account_id), amount: 699_000, order_type: 'PLAN', order_id: nil, tid: 'PSCONC1')
      end
    end.join
    resume << true
    saver.join

    attrs = Account.find(account_id).custom_attributes
    expect(attrs['payment']).to include('bank_bin' => '970422', 'account_number' => '0123456789')
    expect(attrs).to include('subscription_status' => 'active', 'subscription_plan' => 'growth', 'last_casso_tid' => 'PSCONC1')
    expect(attrs['tenant_slug']).to eq('psconc')
  end
end
