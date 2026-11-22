require 'rails_helper'

RSpec.describe Kchat::Publishing::FacebookPublisher do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_facebook_page, account: account, page_id: 'PAGE1', page_access_token: 'PAGE_TOKEN') }
  let(:inbox) { create(:inbox, channel: channel, account: account) }
  let(:graph) { 'https://graph.facebook.com/v22.0' }
  let(:png) { Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/avatar.png'), 'image/png') }
  let(:png2) { Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/sample.png'), 'image/png') }
  let(:mp4) { Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/sample.mp4'), 'video/mp4') }

  def create_post(format, files = [])
    post = Kchat::Post.new(account: account, inbox: inbox, post_format: format, caption: 'Xin chào', scheduled_at: 1.minute.ago,
                           status: 'publishing')
    post.media.attach(files) if files.any?
    post.save!
    post
  end

  def json(body, status: 200)
    { status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' } }
  end

  def stub_permalink(object_id, url = "https://www.facebook.com/#{object_id}")
    stub_request(:get, "#{graph}/#{object_id}").with(query: hash_including('fields' => 'permalink_url')).to_return(json(permalink_url: url))
  end

  def publish_error(post)
    described_class.new(post).publish!
    nil
  rescue Kchat::Publishing::Error => e
    e
  end

  def stub_feed_error(code, message, status)
    stub_request(:post, "#{graph}/PAGE1/feed").to_return(json({ error: { code: code, message: message } }, status: status))
  end

  it 'publishes a text post with the token in the body, not the URL' do
    feed = stub_request(:post, "#{graph}/PAGE1/feed").with(body: hash_including('message' => 'Xin chào', 'access_token' => 'PAGE_TOKEN'))
                                                     .to_return(json(id: 'PAGE1_111'))
    stub_permalink('PAGE1_111')

    result = described_class.new(create_post('text')).publish!

    expect(result).to eq(external_post_id: 'PAGE1_111', permalink: 'https://www.facebook.com/PAGE1_111')
    expect(feed).to have_been_requested.once
  end

  it 'publishes one photo and returns the feed post id' do
    stub_request(:post, "#{graph}/PAGE1/photos").to_return(json(id: 'PHOTO1', post_id: 'PAGE1_222'))
    stub_permalink('PAGE1_222')

    expect(described_class.new(create_post('photo', [png])).publish![:external_post_id]).to eq('PAGE1_222')
  end

  it 'uploads album photos unpublished, then attaches them to one feed post' do
    stub_request(:post, "#{graph}/PAGE1/photos").to_return(json(id: 'P1'), json(id: 'P2'))
    feed = stub_request(:post, "#{graph}/PAGE1/feed")
           .with { |req| req.body.include?('attached_media%5B0%5D') && req.body.include?('attached_media%5B1%5D') }
           .to_return(json(id: 'PAGE1_333'))
    stub_permalink('PAGE1_333')

    expect(described_class.new(create_post('album', [png, png2])).publish![:external_post_id]).to eq('PAGE1_333')
    expect(feed).to have_been_requested.once
  end

  it 'uploads a video to the video host and turns a relative permalink into a full URL' do
    stub_request(:post, 'https://graph-video.facebook.com/v22.0/PAGE1/videos').to_return(json(id: 'VID1'))
    stub_permalink('VID1', '/PAGE1/videos/VID1/')

    result = described_class.new(create_post('video', [mp4])).publish!
    expect(result).to eq(external_post_id: 'VID1', permalink: 'https://www.facebook.com/PAGE1/videos/VID1/')
  end

  it 'publishes a Reel in three phases and flags AI media' do
    reels = "#{graph}/PAGE1/video_reels"
    start = stub_request(:post, reels).with(body: hash_including('upload_phase' => 'start'))
                                      .to_return(json(video_id: 'REEL1', upload_url: 'https://rupload.facebook.com/video-upload/v22.0/REEL1'))
    upload = stub_request(:post, 'https://rupload.facebook.com/video-upload/v22.0/REEL1')
             .with(headers: { 'Authorization' => 'OAuth PAGE_TOKEN', 'offset' => '0' }).to_return(json(success: true))
    finish = stub_request(:post, reels)
             .with(body: hash_including('upload_phase' => 'finish', 'video_id' => 'REEL1', 'video_state' => 'PUBLISHED',
                                        'is_ai_generated' => 'true'))
             .to_return(json(success: true))
    stub_permalink('REEL1')
    post = create_post('reel', [mp4])
    post.update!(ai_generated: true)

    expect(described_class.new(post).publish![:external_post_id]).to eq('REEL1')
    expect([start, upload, finish]).to all(have_been_requested.once)
  end

  it 'still returns the post id when the permalink lookup fails' do
    stub_request(:post, "#{graph}/PAGE1/feed").to_return(json(id: 'PAGE1_444'))
    stub_request(:get, "#{graph}/PAGE1_444").with(query: hash_including({})).to_return(json({ error: { code: 1 } }, status: 500))

    expect(described_class.new(create_post('text')).publish!).to eq(external_post_id: 'PAGE1_444', permalink: nil)
  end

  describe 'errors' do
    it 'maps an expired token to token_invalid, not retryable' do
      stub_feed_error(190, 'Session expired', 400)
      error = publish_error(create_post('text'))
      expect([error.code, error.retryable, error.message]).to eq(['token_invalid', false, 'Session expired'])
    end

    it 'maps a missing permission to permission_denied' do
      stub_feed_error(200, 'Requires pages_manage_posts', 403)
      expect(publish_error(create_post('text')).code).to eq('permission_denied')
    end

    it 'treats a temporary Graph error as retryable' do
      stub_feed_error(2, 'Service temporarily unavailable', 503)
      error = publish_error(create_post('text'))
      expect([error.code, error.retryable]).to eq(['temporary_error', true])
    end

    it 'never retries a read timeout because the post may exist' do
      stub_request(:post, "#{graph}/PAGE1/feed").to_raise(Net::ReadTimeout)
      error = publish_error(create_post('text'))
      expect([error.code, error.retryable]).to eq(['publish_unknown', false])
    end

    it 'retries when the connection never opened' do
      stub_request(:post, "#{graph}/PAGE1/feed").to_raise(Net::OpenTimeout)
      error = publish_error(create_post('text'))
      expect([error.code, error.retryable]).to eq(['network_error', true])
    end

    it 'refuses a post whose inbox is not a Facebook Page' do
      post = create_post('text')
      post.update_column(:inbox_id, nil) # rubocop:disable Rails/SkipsModelValidations

      expect { described_class.new(post.reload) }.to raise_error(Kchat::Publishing::Error, 'inbox_not_facebook_page')
    end
  end
end
