# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat broadcasts API (campaign wizard)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let!(:inbox) { create(:inbox, account: account, channel: create(:channel_zalo_personal, account: account)) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/broadcasts" }

  it 'saves, edits, sends and reports a draft campaign' do
    contact = create(:contact, account: account, name: 'Lan')
    create(:contact_inbox, contact: contact, inbox: inbox, source_id: 'zalo_lan')

    post base, params: { title: 'Ra mắt', goal: 'launch', draft: true }, headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:created)
    id = response.parsed_body.dig('broadcast', 'id')
    expect(response.parsed_body['broadcast']).to include('status' => 'draft', 'goal' => 'launch')

    patch "#{base}/#{id}", params: { message: 'Chào {{name}}', inbox_id: inbox.id, draft: true },
                           headers: admin.create_new_auth_token, as: :json
    expect(response.parsed_body['broadcast']).to include('status' => 'draft', 'inbox_id' => inbox.id)

    expect do
      patch "#{base}/#{id}", params: { draft: false }, headers: admin.create_new_auth_token, as: :json
    end.to have_enqueued_job(Kchat::SendBroadcastJob)
    expect(response.parsed_body['broadcast']).to include('status' => 'processing', 'eligible_count' => 1)

    perform_enqueued_jobs
    get "#{base}/#{id}", headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['results']).to include('sent_count' => 1, 'read_supported' => false, 'read_count' => nil,
                                                       'replied_count' => 0, 'orders_count' => 0)
  end

  it 'returns the audience per inbox and checks banned phrases' do
    get "#{base}/audience", params: { labels: 'vip' }, headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['audience_count']).to eq(0)
    expect(response.parsed_body['channels'].first).to include('inbox_id' => inbox.id, 'channel_type' => 'zalo_personal',
                                                              'rate_limit' => { 'per_minute' => 30, 'burst' => 10 })

    post "#{base}/check_content", params: { message: 'Cam kết vĩnh viễn' }, headers: admin.create_new_auth_token, as: :json
    expect(response.parsed_body['blocked_phrases']).to eq(['cam kết vĩnh viễn'])
  end

  it 'lets only admins change campaigns and only drafts be deleted' do
    post base, params: { title: 'Nháp', draft: true }, headers: admin.create_new_auth_token, as: :json
    id = response.parsed_body.dig('broadcast', 'id')

    patch "#{base}/#{id}", params: { title: 'x' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)
    delete "#{base}/#{id}", headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)

    delete "#{base}/#{id}", headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:no_content)
    get "#{base}/#{id}", headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:not_found)
  end

  it 'answers 422 with a readable message for an invalid send' do
    post base, params: { title: 'Thiếu kênh', message: 'Hi' }, headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('Vui lòng chọn kênh gửi')
  end

  it 'refuses to send a draft with 403 when the trial has expired' do
    post base, params: { title: 'Nháp', message: 'Hi', inbox_id: inbox.id, draft: true }, headers: admin.create_new_auth_token, as: :json
    id = response.parsed_body.dig('broadcast', 'id')
    account.update_columns(created_at: 30.days.ago) # rubocop:disable Rails/SkipsModelValidations

    expect do
      patch "#{base}/#{id}", params: { draft: false }, headers: admin.create_new_auth_token, as: :json
    end.not_to have_enqueued_job(Kchat::SendBroadcastJob)
    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('subscription_expired')
  end

  it 'answers schedule_in_past for a schedule that already passed' do
    post base, params: { title: 'Muộn', message: 'Hi', inbox_id: inbox.id, scheduled_at: 1.hour.ago.iso8601 },
               headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('schedule_in_past')
  end
end
