# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Console payment events API', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:headers) { super_admin.create_new_auth_token }
  let(:base) { '/api/v1/console/payment_events' }
  let(:account) { create(:account) }
  let!(:unmatched) do
    Kchat::PaymentEvent.create!(tid: 'U1', amount: 699_000, description: 'KALO XXX 12', status: 'unmatched', received_at: 1.hour.ago)
  end
  let!(:matched) { Kchat::PaymentEvent.create!(tid: 'M1', amount: 299_000, status: 'matched', account: account, received_at: 2.hours.ago) }

  it 'agent and administrator get 403, SuperAdmin gets 200' do
    %i[agent administrator].each do |role|
      user = create(:user, account: account, role: role)
      get base, headers: user.create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
      post "#{base}/#{unmatched.id}/assign", params: { account_id: account.id }, headers: user.create_new_auth_token, as: :json
      expect(response).to have_http_status(:forbidden)
    end
    expect(unmatched.reload.status).to eq('unmatched')
    get base, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'requires authentication' do
    get base
    expect(response).to have_http_status(:unauthorized)
  end

  it 'lists newest first, filtered by status, in payload/meta shape' do
    get base, headers: headers, as: :json
    expect(response.parsed_body['payload'].pluck('tid')).to eq(%w[U1 M1])
    expect(response.parsed_body['meta']).to eq('count' => 2, 'current_page' => 1, 'per_page' => 25)
    get base, params: { status: 'unmatched' }, headers: headers, as: :json
    expect(response.parsed_body['payload'].pluck('tid')).to eq(['U1'])
  end

  describe 'POST assign' do
    it 'assign payment event credits the account once and marks the event applied' do
      post "#{base}/#{unmatched.id}/assign", params: { account_id: account.id }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include('status' => 'applied', 'account_id' => account.id)
      attrs = account.reload.custom_attributes
      expect(attrs['subscription_plan']).to eq('growth')
      first_until = attrs['subscription_valid_until']
      expect(unmatched.reload).to have_attributes(status: 'applied', account_id: account.id)

      post "#{base}/#{unmatched.id}/assign", params: { account_id: account.id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('event_not_assignable')
      expect(account.reload.custom_attributes['subscription_valid_until']).to eq(first_until)
    end

    it 'credits TOKEN events by the type found in the description' do
      event = Kchat::PaymentEvent.create!(tid: 'T1', amount: 50_000, description: 'KALO XXX TOKEN 3', status: 'unmatched', received_at: Time.current)
      post "#{base}/#{event.id}/assign", params: { account_id: account.id }, headers: headers, as: :json
      expect(account.reload.custom_attributes['ai_tokens_balance']).to eq(50_000)
    end

    it 'refuses events that are already matched' do
      post "#{base}/#{matched.id}/assign", params: { account_id: account.id }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(account.reload.custom_attributes['subscription_plan']).to be_nil
    end

    it 'returns 404 for an unknown account or event' do
      post "#{base}/#{unmatched.id}/assign", params: { account_id: 0 }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      post "#{base}/0/assign", params: { account_id: account.id }, headers: headers, as: :json
      expect(response).to have_http_status(:not_found)
      expect(unmatched.reload.status).to eq('unmatched')
    end
  end
end
