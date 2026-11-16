# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Console overview API', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:url) { '/api/v1/console/overview' }

  it 'requires authentication' do
    get url
    expect(response).to have_http_status(:unauthorized)
  end

  it 'agent and administrator get 403, SuperAdmin gets 200' do
    account = create(:account)
    %i[agent administrator].each do |role|
      get url, headers: create(:user, account: account, role: role).create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
    end
    get url, headers: super_admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'summarises shops, revenue, expiring accounts, unmatched payments and plans' do
    create(:account, custom_attributes: { 'subscription_plan' => 'starter', 'subscription_valid_until' => 3.days.from_now.iso8601 })
    create(:account, custom_attributes: { 'subscription_plan' => 'growth', 'subscription_valid_until' => 30.days.from_now.iso8601 })
    mine = create(:account)
    Kchat::PaymentEvent.create!(tid: 'a', amount: 299_000, status: 'matched', account: mine, received_at: Time.current)
    Kchat::PaymentEvent.create!(tid: 'b', amount: 699_000, status: 'applied', account: mine, received_at: Time.current)
    Kchat::PaymentEvent.create!(tid: 'c', amount: 111_000, status: 'unmatched', received_at: Time.current)
    Kchat::PaymentEvent.create!(tid: 'd', amount: 999_000, status: 'matched', account: mine, received_at: 2.months.ago)

    get url, headers: super_admin.create_new_auth_token, as: :json

    body = response.parsed_body
    expect(body).to include('shops' => 3, 'revenue_month' => 998_000, 'expiring_7d' => 1, 'unmatched_payments' => 1)
    expect(body['shops_by_plan']).to eq('starter' => 1, 'growth' => 1, 'enterprise' => 0)
    expect(body['recent_payments'].pluck('tid')).to eq(%w[c b a d])
    expect(body['recent_payments'].first.keys).to contain_exactly('id', 'tid', 'amount', 'description', 'status', 'account_id', 'account_name',
                                                                  'received_at')
  end

  it 'starts the month at midnight Vietnam time' do
    travel_to(Time.utc(2026, 10, 31, 18, 0)) do # 01:00 on 1 Nov in Ho Chi Minh
      Kchat::PaymentEvent.create!(tid: 'in', amount: 1000, status: 'matched', received_at: Time.utc(2026, 10, 31, 17, 30))
      Kchat::PaymentEvent.create!(tid: 'out', amount: 500, status: 'matched', received_at: Time.utc(2026, 10, 31, 16, 30))
      get url, headers: super_admin.create_new_auth_token, as: :json
    end

    expect(response.parsed_body['revenue_month']).to eq(1000)
  end

  describe 'api_access_token' do
    it 'refuses normal users tokens with 403 and an agent bot with 401' do
      account = create(:account)
      %i[agent administrator].each do |role|
        user = create(:user, account: account, role: role)
        get url, headers: { 'api_access_token' => user.access_token.token }, as: :json
        expect(response).to have_http_status(:forbidden)
      end
      get url, headers: { 'api_access_token' => create(:agent_bot).access_token.token }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it 'accepts the access token of a SuperAdmin user' do
      get url, headers: { 'api_access_token' => super_admin.access_token.token }, as: :json
      expect(response).to have_http_status(:ok)
    end
  end
end
