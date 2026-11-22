require 'rails_helper'

RSpec.describe 'Kchat media studio API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:studio_user) { create(:user, account: account, role: :agent) }
  let(:channel) { create(:channel_facebook_page, account: account) }
  let(:inbox) { create(:inbox, channel: channel, account: account) }
  let(:base) { "/api/v1/accounts/#{account.id}/kchat" }
  let(:studio_headers) { { api_access_token: studio_user.access_token.token } }
  let(:mp4) { fixture_file_upload(Rails.root.join('spec/assets/sample.mp4'), 'video/mp4') }

  before do
    account.enable_features!('kalo_auto_posting')
    account.update!(custom_attributes: { 'brand_growth' => { 'profile' => { 'brand_name' => 'Trà Sen', 'tone' => 'ấm áp' } } })
  end

  def create_post(attrs = {})
    Kchat::Post.create!({ account: account, inbox: inbox, caption: 'Ra mắt trà sen', scheduled_at: 2.hours.from_now,
                          media_brief: 'Reel 20 giây: pha trà sen, cận cảnh hơi nước' }.merge(attrs))
  end

  it 'runs request -> claim -> deliver and leaves a draft for a person to approve' do
    draft = create_post

    post "#{base}/posts/#{draft.id}/request_media", params: { note: 'Ánh sáng tự nhiên' }, headers: agent.create_new_auth_token, as: :json
    expect(response.parsed_body).to include('media_request_status' => 'requested', 'media_request_note' => 'Ánh sáng tự nhiên')

    get "#{base}/studio/requests", headers: studio_headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['payload'].pluck('id')).to eq([draft.id])
    expect(response.parsed_body['meta']['brand_profile']).to include('brand_name' => 'Trà Sen')

    post "#{base}/studio/requests/#{draft.id}/claim", headers: studio_headers
    expect(response.parsed_body['media_request_status']).to eq('in_production')

    post "#{base}/studio/requests/#{draft.id}/claim", headers: studio_headers
    expect(response).to have_http_status(:unprocessable_entity)

    post "#{base}/studio/requests/#{draft.id}/deliver", params: { media: [mp4], ai_generated: 'true' }, headers: studio_headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include('status' => 'draft', 'post_format' => 'reel', 'media_request_status' => 'delivered',
                                            'ai_generated' => true, 'blockers' => [])
    expect(draft.reload.caption).to eq('Ra mắt trà sen')
  end

  it 'needs a media brief to request media' do
    draft = create_post(media_brief: nil)

    post "#{base}/posts/#{draft.id}/request_media", headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['blockers']).to eq(['media_brief_required'])
  end

  it 'records a studio failure' do
    requested = create_post(media_request_status: 'in_production')

    post "#{base}/studio/requests/#{requested.id}/fail", params: { note: 'Thiếu ảnh sản phẩm' }, headers: studio_headers

    expect(requested.reload).to have_attributes(media_request_status: 'failed', media_request_note: 'Thiếu ảnh sản phẩm')
  end

  describe 'POST studio/posts' do
    it 'creates a draft Reel once per studio video' do
      params = { source_ref: 'video-42', inbox_id: inbox.id, caption: 'Video mới', ai_generated: 'true', media: [mp4] }

      post "#{base}/studio/posts", params: params, headers: studio_headers
      expect(response).to have_http_status(:created)
      created = Kchat::Post.find(response.parsed_body['id'])
      expect(created).to have_attributes(source: 'studio', source_ref: 'video-42', post_format: 'reel', status: 'draft',
                                         created_by: studio_user, ai_generated: true)

      post "#{base}/studio/posts", params: params, headers: studio_headers
      expect(response).to have_http_status(:ok)
      expect(Kchat::Post.where(source_ref: 'video-42').count).to eq(1)
    end

    it 'needs media and a source_ref' do
      post "#{base}/studio/posts", params: { source_ref: 'video-1' }, headers: studio_headers
      expect(response.parsed_body['error']).to eq('media_required')

      post "#{base}/studio/posts", params: { media: [mp4] }, headers: studio_headers
      expect(response.parsed_body['error']).to eq('source_ref_required')
    end
  end

  it 'is hidden when the shop does not have auto posting' do
    account.disable_features!('kalo_auto_posting')
    get "#{base}/studio/requests", headers: studio_headers
    expect(response).to have_http_status(:forbidden)
  end
end
