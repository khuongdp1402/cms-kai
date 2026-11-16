# frozen_string_literal: true

require 'rails_helper'

# The authoritative AI rate limit lives in the controller and is keyed on the authorized account id, so it does not depend on
# how the path is spelled. Rack::Attack stays disabled here (it is off outside production) to test only that layer.
RSpec.describe 'Brand growth AI rate limit', type: :request do
  let(:account) { create(:account) }
  let(:other_account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:other_agent) { create(:user, account: other_account, role: :agent) }
  let(:limit) { ENV.fetch('BRAND_GROWTH_AI_LIMIT', '30').to_i }

  # Kchat::AiThrottle.store is a fresh MemoryStore for every example (spec/support/ai_throttle.rb).
  around do |example|
    travel_to(Time.utc(2026, 1, 1, 12, 0, 10)) { example.run }
  end

  def call(path, user: agent, action: 'chat_reply')
    post "#{path}/#{action}", params: { message: 'hi', topic: 'x' }, headers: user.create_new_auth_token, as: :json
    response.status
  end

  def path_for(acc, segment = acc.id.to_s)
    "/api/v1/accounts/#{segment}/brand_growth"
  end

  it 'answers 429 rate_limited on the call after the limit' do
    limit.times { expect(call(path_for(account))).not_to eq(429) }

    expect(call(path_for(account))).to eq(429)
    expect(response.parsed_body).to eq('error' => 'rate_limited')
  end

  it 'shares one counter between chat_reply and repurpose' do
    limit.times { call(path_for(account)) }

    expect(call(path_for(account), action: 'repurpose')).to eq(429)
  end

  [:leading_zeros, :encoded_dot, :raw_dot, :encoded_slash, :plus].each do |kind|
    it "shares one counter with the plain id for the #{kind} alias (or the router refuses the alias)" do
      id = account.id
      segment = { leading_zeros: format('%05d', id), encoded_dot: "#{id}%2E5", raw_dot: "#{id}.5", encoded_slash: "#{id}%2Fx", plus: "+#{id}" }[kind]
      first = call(path_for(account, segment))
      if first == 404
        expect(response).to have_http_status(:not_found) # the router refused it: nothing to throttle
      else
        (limit - 1).times { call(path_for(account, segment)) }

        expect(call(path_for(account))).to eq(429)
      end
    end
  end

  it 'really increments a shared counter: the call after the limit is the first 429' do
    statuses = Array.new(limit + 1) { call(path_for(account)) }

    expect(statuses.first(limit)).not_to include(429)
    expect(statuses.last).to eq(429)
    expect(Kchat::AiThrottle.store).to be_a(ActiveSupport::Cache::MemoryStore)
  end

  context 'with Rack::Attack enabled and an attacker hammering the victim path' do
    let(:attacker) { create(:user, account: other_account, role: :agent) }

    around do |example|
      previous = Rack::Attack.enabled
      previous_store = Rack::Attack.cache.store
      Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
      Rack::Attack.enabled = true
      example.run
    ensure
      Rack::Attack.enabled = previous
      Rack::Attack.cache.store = previous_store
    end

    def hammer(path, headers: {})
      post "#{path}/chat_reply", params: { message: 'hi' }, headers: { 'REMOTE_ADDR' => '203.0.113.50' }.merge(headers), as: :json
      response.status
    end

    it 'does not let an unauthenticated caller consume the victim counter' do
      statuses = Array.new(limit + 5) { hammer(path_for(account)) }

      expect(statuses.uniq).to eq([401])
      expect(call(path_for(account))).not_to eq(429)
    end

    it 'does not let another tenant consume the victim counter' do
      statuses = Array.new(limit + 5) { hammer(path_for(account), headers: attacker.create_new_auth_token) }

      expect(statuses.uniq).to all(satisfy { |s| [401, 403, 404].include?(s) })
      expect(call(path_for(account))).not_to eq(429)
    end
  end

  it 'gives a different account its own counter' do
    limit.times { call(path_for(account)) }

    expect(call(path_for(other_account), user: other_agent)).not_to eq(429)
  end
end
