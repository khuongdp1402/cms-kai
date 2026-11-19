# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat reports API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/reports/summary" }

  it 'requires authentication' do
    get url
    expect(response).to have_http_status(:unauthorized)
  end

  it 'returns the contract shape for the account' do
    Kchat::Order.create_with_items!(account: account, attributes: { source: 'manual', payment_method: 'cash' },
                                    items: [{ name: 'A', unit_price: 5000, quantity: 2 }])
    get url, params: { range: '7d' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body.keys).to contain_exactly('range', 'today', 'revenue', 'orders_count', 'new_contacts', 'waiting_messages', 'channels', 'daily',
                                         'top_products')
    expect(body).to include('range' => '7d', 'revenue' => 10_000, 'orders_count' => 1)
    expect(body['daily'].size).to eq(7)
    expect(body['today']).to eq(body['daily'].last['date'])
  end

  it 'defaults to today and rejects an unknown range with 422' do
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response.parsed_body['range']).to eq('today')
    get url, params: { range: 'year' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('invalid_range')
  end

  it 'still works after the trial has expired' do
    account.update_columns(created_at: 60.days.ago) # rubocop:disable Rails/SkipsModelValidations
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'returns marketing funnel and multi-brand overview endpoints cleanly' do
    base_url = "/api/v1/accounts/#{account.id}/kchat/reports"
    get "#{base_url}/funnel", params: { range: '7d' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.keys).to contain_exactly('range', 'totals', 'channel_funnel', 'campaigns', 'agents')

    get "#{base_url}/brands_overview", params: { range: 'today' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['brands'].first).to include('id' => account.id, 'name' => account.name)

    get "#{base_url}/funnel", params: { range: 'bad' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'returns quality_overview endpoint and validates range' do
    base_url = "/api/v1/accounts/#{account.id}/kchat/reports"
    get "#{base_url}/quality_overview", params: { range: '7d' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.keys).to contain_exactly('range', 'kpis', 'sku_quality', 'channel_quality', 'action_queue')

    get "#{base_url}/quality_overview", params: { range: 'bad' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
