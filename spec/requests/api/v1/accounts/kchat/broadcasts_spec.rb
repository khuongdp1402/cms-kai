# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat broadcasts API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:zalo_channel) { create(:channel_zalo_personal, account: account) }
  let!(:inbox) { create(:inbox, account: account, channel: zalo_channel) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/broadcasts" }

  it 'requires authentication and admin role to create broadcasts' do
    get base, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)

    post base, params: { title: 'Sale', inbox_id: inbox.id, message: 'Hi' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it 'previews, creates a broadcast, and gates expired trials with 403' do
    get "#{base}/preview", params: { inbox_id: inbox.id }, headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include('inbox_id' => inbox.id, 'eligible_count' => 0)

    expect do
      post base, params: { title: 'Cuối tuần', inbox_id: inbox.id, message: 'Giảm 10%', campaign_tag: 'weekend_10' },
                 headers: admin.create_new_auth_token, as: :json
    end.to have_enqueued_job(Kchat::SendBroadcastJob)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body.dig('broadcast', 'campaign_tag')).to eq('weekend_10')

    account.update_columns(created_at: 30.days.ago) # rubocop:disable Rails/SkipsModelValidations
    post base, params: { title: 'Blocked', inbox_id: inbox.id, message: 'Hi' },
               headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('subscription_expired')
  end
end
