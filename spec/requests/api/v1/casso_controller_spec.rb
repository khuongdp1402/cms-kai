# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Casso webhook', type: :request do
  let!(:account) { create(:account, custom_attributes: { 'tenant_slug' => 'hana' }) }
  let(:payload) { { error: 0, data: [{ tid: 'FT9', description: 'KALO HANA 1', amount: 699_000 }] } }

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

  describe 'GET status' do
    it 'publishes bank details and the KALO transfer syntax' do
      with_modified_env(CASSO_BANK_NAME: 'MB', CASSO_ACCOUNT_NUMBER: '123', CASSO_ACCOUNT_NAME: 'KTECH') do
        get '/api/v1/casso/status'
      end
      expect(response.parsed_body).to eq('bank' => 'MB', 'account_number' => '123', 'account_name' => 'KTECH',
                                         'syntax' => 'KALO <ACCOUNT_ID> [PLAN|TOKEN|SEED] [ORDER_ID]')
    end
  end

  describe 'payload shapes' do
    let(:headers) { { 'Secure-Token' => 'secret-token' } }
    let(:tx) { { tid: 'FT10', description: 'KALO HANA 1', amount: 699_000 } }

    around { |ex| with_modified_env(CASSO_SECURE_TOKEN: 'secret-token') { ex.run } }

    it 'credits a payment sent as a single `data` object' do
      post '/api/v1/casso/webhook', params: { error: 0, data: tx }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(account.reload.custom_attributes['subscription_status']).to eq('active')
    end

    it 'credits a payment sent as a top-level transaction' do
      post '/api/v1/casso/webhook', params: tx, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(account.reload.custom_attributes['subscription_status']).to eq('active')
    end

    [
      ['without data', { error: 0 }],
      ['with null data', { error: 0, data: nil }],
      ['with string data', { error: 0, data: 'x' }],
      ['with number data', { error: 0, data: 12 }]
    ].each do |label, body|
      it "answers 400 invalid_payload #{label} and logs a warning without the body" do
        allow(Rails.logger).to receive(:warn)

        post '/api/v1/casso/webhook', params: body.merge(note: 'SECRET-BODY-MARKER'), headers: headers, as: :json

        expect(response).to have_http_status(:bad_request)
        expect(response.parsed_body).to eq('error' => 'invalid_payload')
        expect(Rails.logger).to have_received(:warn).with(satisfy { |m| m.include?('[Casso]') && m.exclude?('SECRET-BODY-MARKER') })
      end
    end
  end
end
