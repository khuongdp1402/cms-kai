require 'rails_helper'

RSpec.describe 'Kchat payment settings API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/payment_settings" }
  let(:settings) { { bank_bin: '970436', bank_name: 'Vietcombank', account_number: '0123456789', account_name: 'NGUYEN VAN A' } }

  it 'returns empty fields when nothing is saved' do
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('bank_bin' => nil, 'bank_name' => nil, 'account_number' => nil, 'account_name' => nil)
  end

  it 'administrator can update and read back, keeping other custom attributes' do
    account.update!(custom_attributes: { 'onboarding_step' => 'x' })
    patch url, params: settings.merge(id: 5, evil: 'y'), headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(settings.stringify_keys)
    expect(account.reload.custom_attributes).to eq('onboarding_step' => 'x', 'payment' => settings.stringify_keys)
  end

  it 'agent can read but not update' do
    account.update!(custom_attributes: { 'payment' => settings.stringify_keys })
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response.parsed_body['account_number']).to eq('0123456789')

    patch url, params: { account_number: '1' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(account.reload.custom_attributes['payment']['account_number']).to eq('0123456789')
  end

  describe 'GET preview_qr' do
    let(:preview_url) { "#{url}/preview_qr" }

    it 'returns a VietQR PNG for unsaved values with a sample amount' do
      allow(Kchat::VietQr).to receive(:payload).and_call_original
      get preview_url, params: { bank_bin: '970436', account_number: '0123456789' }, headers: admin.create_new_auth_token

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq('image/png')
      expect(response.body.byteslice(0, 8)).to eq("\x89PNG\r\n\x1A\n".b)
      expect(Kchat::VietQr).to have_received(:payload)
        .with(bin: '970436', account_number: '0123456789', amount: Api::V1::Accounts::Kchat::PaymentSettingsController::PREVIEW_AMOUNT,
              memo: Api::V1::Accounts::Kchat::PaymentSettingsController::PREVIEW_MEMO)
      expect(account.reload.custom_attributes&.dig('payment')).to be_nil
    end

    it 'rejects malformed values with the same validation error' do
      get preview_url, params: { bank_bin: '12345', account_number: '0123456789' }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to include('error' => 'validation_failed')
    end

    it 'is for administrators only' do
      get preview_url, params: { bank_bin: '970436', account_number: '0123456789' }, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  {
    bank_bin: %w[12345 12345a 1234567],
    account_number: ['12345', '12a456789', '1' * 20],
    account_name: ['', 'A' * 61],
    bank_name: ['', 'B' * 61]
  }.each do |field, bad_values|
    bad_values.each do |value|
      it "rejects #{field} #{value.inspect}" do
        patch url, params: settings.merge(field => value), headers: admin.create_new_auth_token, as: :json
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body).to include('error' => 'validation_failed')
        expect(response.parsed_body['message']).to be_present
        expect(account.reload.custom_attributes&.dig('payment')).to be_nil
      end
    end
  end
end
