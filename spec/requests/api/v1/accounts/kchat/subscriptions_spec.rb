# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat subscription API', type: :request do
  let(:account) { create(:account, custom_attributes: attrs) }
  let(:attrs) { {} }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/subscription" }

  around { |ex| with_modified_env(CASSO_BANK_NAME: 'MB Bank', CASSO_ACCOUNT_NUMBER: '0123', CASSO_ACCOUNT_NAME: 'KTECH') { ex.run } }

  it 'requires authentication' do
    get url
    expect(response).to have_http_status(:unauthorized)
  end

  it 'reports the trial with bank details, memo and prices' do
    get url, headers: agent.create_new_auth_token, as: :json

    body = response.parsed_body
    expect(response).to have_http_status(:ok)
    expect(body).to include('plan' => nil, 'status' => 'trial', 'memo' => "KALO #{account.id} PLAN", 'days_left' => 14)
    expect(body['bank']).to eq('bank' => 'MB Bank', 'account_number' => '0123', 'account_name' => 'KTECH')
    expect(body['prices']).to eq('starter' => 299_000, 'growth' => 699_000, 'enterprise' => 1_990_000)
    expect(Time.zone.parse(body['valid_until'])).to be_within(1.minute).of(account.created_at + 14.days)
  end

  context 'with an active subscription' do
    let(:attrs) { { 'subscription_plan' => 'growth', 'subscription_valid_until' => 10.days.from_now.iso8601 } }

    it 'reports plan, status and days left' do
      get url, headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body).to include('plan' => 'growth', 'status' => 'active', 'days_left' => 10)
    end
  end

  context 'when expired' do
    let(:attrs) { { 'subscription_plan' => 'starter', 'subscription_valid_until' => 2.days.ago.iso8601 } }

    it 'reports expired with zero days left' do
      account.update_columns(created_at: 90.days.ago) # rubocop:disable Rails/SkipsModelValidations
      get url, headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body).to include('status' => 'expired', 'days_left' => 0)
    end
  end

  it 'fails loudly when bank settings are missing' do
    with_modified_env(CASSO_BANK_NAME: nil) do
      get url, headers: agent.create_new_auth_token, as: :json
    end
    expect(response).to have_http_status(:internal_server_error)
  end

  it 'returns a memo that the Casso webhook matches and credits' do
    get url, headers: agent.create_new_auth_token, as: :json
    memo = response.parsed_body['memo']

    result = Casso::WebhookHandler.new('data' => [{ 'tid' => 'MEMO1', 'description' => memo, 'amount' => 699_000 }]).process[:results].first

    expect(result).to include(status: 'matched_and_activated', account_id: account.id)
    expect(account.reload.custom_attributes['subscription_plan']).to eq('growth')
  end
end
