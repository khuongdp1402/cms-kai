require 'rails_helper'

RSpec.describe 'Kchat posts API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:channel) { create(:channel_facebook_page, account: account) }
  let(:inbox) { create(:inbox, channel: channel, account: account) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat/posts" }
  let(:schedule) { 2.hours.from_now.change(usec: 0) }

  before { account.enable_features!('kalo_auto_posting') }

  def create_post(attrs = {})
    Kchat::Post.create!({ account: account, inbox: inbox, caption: 'Bài mới', scheduled_at: schedule }.merge(attrs))
  end

  it 'requires authentication' do
    get base
    expect(response).to have_http_status(:unauthorized)
  end

  it 'is hidden when the shop does not have auto posting' do
    account.disable_features!('kalo_auto_posting')
    get base, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('feature_disabled')
  end

  describe 'GET index' do
    it 'lists own posts in a date range, ordered by schedule' do
      later = create_post(scheduled_at: 3.days.from_now)
      sooner = create_post(scheduled_at: 1.day.from_now)
      create_post(scheduled_at: 40.days.from_now)
      foreign_channel = create(:channel_facebook_page)
      Kchat::Post.create!(account: foreign_channel.account, caption: 'Lạ')

      get base, params: { from: Time.current.iso8601, to: 7.days.from_now.iso8601 }, headers: agent.create_new_auth_token

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['payload'].pluck('id')).to eq([sooner.id, later.id])
    end

    it 'returns 400 for an invalid date' do
      get base, params: { from: 'not-a-date' }, headers: agent.create_new_auth_token
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe 'POST create' do
    it 'lets an agent draft a photo post with an image' do
      post base, params: { inbox_id: inbox.id, post_format: 'photo', caption: 'Ảnh mới', scheduled_at: schedule.iso8601,
                           media: [fixture_file_upload(Rails.root.join('spec/assets/avatar.png'), 'image/png')] },
                 headers: agent.create_new_auth_token

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body).to include('status' => 'draft', 'post_format' => 'photo', 'blockers' => [])
      expect(body['media'].first).to include('content_type' => 'image/png')
      expect(Kchat::Post.find(body['id']).created_by).to eq(agent)
    end

    it 'rejects an inbox of another account' do
      foreign_channel = create(:channel_facebook_page)
      foreign_inbox = create(:inbox, channel: foreign_channel, account: foreign_channel.account)

      post base, params: { inbox_id: foreign_inbox.id, caption: 'x' }, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'review and approval' do
    it 'agent submits, admin approves and the publish job is scheduled for the post time' do
      draft = create_post

      post "#{base}/#{draft.id}/submit", headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body['status']).to eq('pending_approval')

      expect do
        post "#{base}/#{draft.id}/approve", headers: admin.create_new_auth_token, as: :json
      end.to have_enqueued_job(Kchat::Publishing::PublishPostJob).with(draft.id).at(schedule)

      expect(response.parsed_body).to include('status' => 'approved', 'approved_by_name' => admin.name)
    end

    it 'does not let an agent approve' do
      pending_post = create_post(status: 'pending_approval')

      post "#{base}/#{pending_post.id}/approve", headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(pending_post.reload.status).to eq('pending_approval')
    end

    it 'returns the blockers when the post cannot be published' do
      draft = create_post(caption: nil)

      post "#{base}/#{draft.id}/submit", headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to include('error' => 'not_publishable', 'blockers' => ['content_required'])
    end

    it 'sends an approved post back to draft when it is edited' do
      approved = create_post(status: 'approved', approved_by: admin, approved_at: Time.current)

      patch "#{base}/#{approved.id}", params: { caption: 'Sửa lại' }, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(approved.reload).to have_attributes(status: 'draft', caption: 'Sửa lại', approved_by: nil)
    end

    it 'does not edit or delete a published post' do
      published = create_post(status: 'published', external_post_id: 'PAGE_1')

      patch "#{base}/#{published.id}", params: { caption: 'x' }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)

      delete "#{base}/#{published.id}", headers: admin.create_new_auth_token, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(published.reload.caption).to eq('Bài mới')
    end

    it 'lets an admin retry a failed post right away' do
      failed = create_post(status: 'failed', error_code: 'token_invalid', attempts: 1)

      expect do
        post "#{base}/#{failed.id}/retry_publish", headers: admin.create_new_auth_token, as: :json
      end.to have_enqueued_job(Kchat::Publishing::PublishPostJob).with(failed.id)

      expect(failed.reload).to have_attributes(status: 'approved', attempts: 0, error_code: nil)
    end
  end

  it 'blocks new drafts when the subscription expired' do
    account.update_columns(created_at: 30.days.ago) # rubocop:disable Rails/SkipsModelValidations

    post base, params: { caption: 'x' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('subscription_expired')
  end
end
