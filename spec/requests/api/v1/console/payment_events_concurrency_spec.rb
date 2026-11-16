# frozen_string_literal: true

require 'rails_helper'

# Not transactional: needs real concurrent connections, so it creates and removes its own data.
RSpec.describe 'Console payment events assign concurrency', type: :request do
  self.use_transactional_tests = false

  let!(:account_id) { create(:account).id }
  let!(:event_id) do
    Kchat::PaymentEvent.create!(tid: 'ASSIGN-CONC', amount: 50_000, description: 'KALO XXX TOKEN 3', status: 'unmatched',
                                received_at: Time.current).id
  end
  let!(:headers) { create(:super_admin).create_new_auth_token }

  after do
    Kchat::PaymentEvent.where(id: event_id).delete_all
    Account.where(id: account_id).destroy_all
    SuperAdmin.where(email: headers['uid']).destroy_all
  end

  it 'credits the account once when the same event is assigned by four requests at once' do
    codes = Queue.new
    threads = Array.new(4) do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          session = ActionDispatch::Integration::Session.new(Rails.application)
          session.post "/api/v1/console/payment_events/#{event_id}/assign", params: { account_id: account_id }.to_json,
                                                                            headers: headers.merge('CONTENT_TYPE' => 'application/json')
          codes << session.response.status
        end
      end
    end
    threads.each(&:join)

    expect(Array.new(codes.size) { codes.pop }.tally).to eq(200 => 1, 422 => 3)
    expect(Account.find(account_id).custom_attributes['ai_tokens_balance']).to eq(50_000)
    expect(Kchat::PaymentEvent.find(event_id).status).to eq('applied')
  end
end
