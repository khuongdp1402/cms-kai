# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Casso webhook', type: :request do
  let!(:account) { create(:account, custom_attributes: { 'tenant_slug' => 'hana' }) }
  let(:payload) { { error: 0, data: [{ tid: 'FT9', description: 'KCHAT HANA 1', amount: 699_000 }] } }

  context 'with CASSO_SECURE_TOKEN configured' do
    around { |ex| with_modified_env(CASSO_SECURE_TOKEN: 'secret-token') { ex.run } }

    it 'rejects a request without the token' do
      post '/api/v1/casso/webhook', params: payload, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(account.reload.custom_attributes['subscription_status']).to be_nil
    end

    it 'processes a request with the correct token' do
      post '/api/v1/casso/webhook', params: payload, headers: { 'Secure-Token' => 'secret-token' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(account.reload.custom_attributes['subscription_status']).to eq('active')
    end
  end

  it 'refuses every request when CASSO_SECURE_TOKEN is missing' do
    with_modified_env(CASSO_SECURE_TOKEN: nil) do
      post '/api/v1/casso/webhook', params: payload, as: :json
    end
    expect(response).to have_http_status(:internal_server_error)
    expect(account.reload.custom_attributes['subscription_status']).to be_nil
  end

  it 'does not expose the simulate endpoint outside development' do
    paths = Rails.application.routes.routes.map { |route| route.path.spec.to_s }
    expect(paths.grep(%r{/casso/simulate})).to be_empty
  end
end
