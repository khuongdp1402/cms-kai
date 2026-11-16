# frozen_string_literal: true

require 'rails_helper'

# Rack::Attack is disabled outside production, so these specs switch it on with an in-memory store.
RSpec.describe 'Rack::Attack throttles', type: :request do
  let(:limit) { ENV.fetch('BRAND_GROWTH_AI_LIMIT', '30').to_i }

  # Throttle counters are bucketed per minute: freeze the clock so a run cannot straddle a minute boundary.
  around do |example|
    travel_to(Time.utc(2026, 1, 1, 12, 0, 10)) { example.run }
  end

  around do |example|
    previous_store = Rack::Attack.cache.store
    previous_enabled = Rack::Attack.enabled
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    Rack::Attack.enabled = true
    example.run
  ensure
    Rack::Attack.cache.store = previous_store
    Rack::Attack.enabled = previous_enabled
  end

  # 127.0.0.1 is safelisted by the 'trusted IPs' rule, so requests come from a documentation address.
  def hit(path, ip: '203.0.113.9')
    post path, params: { message: 'hi' }, headers: { 'REMOTE_ADDR' => ip }, as: :json
    response.status
  end

  describe 'brand_growth_ai/account' do
    it 'throttles after the limit for a plain account id' do
      limit.times { expect(hit('/api/v1/accounts/7/brand_growth/chat_reply')).not_to eq(429) }

      expect(hit('/api/v1/accounts/7/brand_growth/chat_reply')).to eq(429)
    end

    [
      '/api/v1/accounts/0007/brand_growth/chat_reply',
      '/api/v1/accounts/0000007/brand_growth/chat_reply',
      '/api/v1/accounts/7/brand_growth/chat_reply/',
      '/api/v1/accounts/7/brand_growth/chat_reply.json',
      '/api/v1/accounts/7/brand_growth//chat_reply',
      '//api/v1/accounts/7/brand_growth/chat_reply',
      '/api/v1/accounts//7/brand_growth/chat_reply',
      '/API/V1/Accounts/7/Brand_Growth/Chat_Reply',
      '/api/v1/accounts/%37/brand_growth/chat_reply',
      '/api/v1/accounts/+7/brand_growth/chat_reply',
      '/api/v1/accounts/7%2E5/brand_growth/chat_reply',
      '/api/v1/accounts/7.5/brand_growth/chat_reply',
      '/api/v1/accounts/7%2Fx/brand_growth/chat_reply',
      '/api/v1/accounts/7%2fx/brand_growth/repurpose.json'
    ].each do |variant|
      it "counts #{variant} in the same bucket as account 7" do
        limit.times { hit('/api/v1/accounts/7/brand_growth/chat_reply') }

        expect(hit(variant)).to eq(429)
      end
    end

    it 'keeps separate buckets for different accounts' do
      limit.times { hit('/api/v1/accounts/7/brand_growth/chat_reply') }

      expect(hit('/api/v1/accounts/8/brand_growth/chat_reply')).not_to eq(429)
    end

    it 'shares the bucket between chat_reply and repurpose' do
      limit.times { hit('/api/v1/accounts/7/brand_growth/chat_reply') }

      expect(hit('/api/v1/accounts/0007/brand_growth/repurpose')).to eq(429)
    end
  end

  describe 'casso_webhook/ip' do
    let(:casso_limit) { ENV.fetch('CASSO_WEBHOOK_LIMIT', '120').to_i }

    it 'throttles webhook posts per IP after the limit, regardless of the token' do
      casso_limit.times { expect(hit('/api/v1/casso/webhook')).not_to eq(429) }

      expect(hit('/api/v1/casso/webhook')).to eq(429)
      expect(hit('/api/v1/casso/webhook/')).to eq(429)
      expect(hit('/api/v1/casso/webhook', ip: '203.0.113.10')).not_to eq(429)
    end

    it 'does not throttle the public status endpoint under this rule' do
      (casso_limit + 1).times { get '/api/v1/casso/status', headers: { 'REMOTE_ADDR' => '203.0.113.11' } }

      expect(response.status).not_to eq(429)
    end
  end

  describe 'client IP used by throttles' do
    let(:casso_limit) { ENV.fetch('CASSO_WEBHOOK_LIMIT', '120').to_i }

    # nginx runs on a private (trusted proxy) address and sets X-Forwarded-For to the real client.
    def post_via_proxy(client_ip, forwarded)
      post '/api/v1/casso/webhook', params: { a: 1 }, as: :json,
                                    headers: { 'REMOTE_ADDR' => '172.18.0.5', 'X-Forwarded-For' => client_ip, 'Forwarded' => forwarded }
      response.status
    end

    it 'counts requests under the real client ip even when each one carries a different spoofed Forwarded header' do
      casso_limit.times { |i| post_via_proxy('203.0.113.20', "for=198.51.100.#{(i % 250) + 1}") }

      expect(post_via_proxy('203.0.113.20', 'for=198.51.100.250')).to eq(429)
    end

    it 'does not let a spoofed Forwarded header exhaust another client bucket' do
      casso_limit.times { post_via_proxy('203.0.113.30', 'for=203.0.113.31') }

      expect(post_via_proxy('203.0.113.31', 'for=203.0.113.31')).not_to eq(429)
    end
  end
end
