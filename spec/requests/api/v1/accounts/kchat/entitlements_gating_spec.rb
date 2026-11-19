# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat expired subscription gating', type: :request do
  let(:account) { create(:account, created_at: 30.days.ago) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:headers) { agent.create_new_auth_token }
  # Products are managed by shop administrators; agents only read them.
  let(:admin_headers) { create(:user, account: account, role: :administrator).create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}" }

  def expect_expired
    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('subscription_expired')
  end

  it 'blocks creating products and orders but still reads' do
    post "#{base}/kchat/products", params: { name: 'Mũ', price: 1000 }, headers: headers, as: :json
    expect_expired
    expect(Kchat::Product.count).to eq(0)

    post "#{base}/kchat/orders", params: { source: 'manual', payment_method: 'cash', items: [{ name: 'A', unit_price: 1, quantity: 1 }] },
                                 headers: headers, as: :json
    expect_expired
    expect(Kchat::Order.count).to eq(0)

    get "#{base}/kchat/products", headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    get "#{base}/kchat/orders", headers: headers, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'still allows updating an existing order' do
    order = Kchat::Order.create_with_items!(account: account, attributes: { source: 'manual', payment_method: 'cod' },
                                            items: [{ name: 'A', unit_price: 1, quantity: 1 }])
    post "#{base}/kchat/orders/#{order.id}/transition", params: { event: 'cancel' }, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'blocks AI actions but not reading the overview or messaging' do
    with_modified_env(AGENTGW_API_KEY: 'k', AI_PROVIDER: 'agentgw') do
      post "#{base}/brand_growth/chat_reply", params: { message: 'hi' }, headers: headers, as: :json
      expect_expired
      post "#{base}/brand_growth/repurpose", params: { topic: 'x' }, headers: headers, as: :json
      expect_expired
      get "#{base}/brand_growth/overview", headers: headers, as: :json
      expect(response).to have_http_status(:ok)
    end
  end

  it 'allows creating products during the trial and when subscribed' do
    account.update_columns(created_at: 1.day.ago) # rubocop:disable Rails/SkipsModelValidations
    post "#{base}/kchat/products", params: { name: 'Mũ', price: 1000 }, headers: admin_headers, as: :json
    expect(response).to have_http_status(:created)

    account.update_columns(created_at: 90.days.ago, custom_attributes: { 'subscription_valid_until' => 5.days.from_now.iso8601 }) # rubocop:disable Rails/SkipsModelValidations
    post "#{base}/kchat/products", params: { name: 'Nón', price: 1000 }, headers: admin_headers, as: :json
    expect(response).to have_http_status(:created)
  end
end
