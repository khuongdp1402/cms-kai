# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Accounts::BrandGrowth', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:base) { "/api/v1/accounts/#{account.id}/brand_growth" }
  let(:gateway) { 'https://agentgw.cloud/v1/chat/completions' }

  around { |ex| with_modified_env(AGENTGW_API_KEY: 'test-key', AI_PROVIDER: 'agentgw') { ex.run } }

  def stub_ai(content)
    stub_request(:post, gateway).to_return(
      status: 200, headers: { 'Content-Type' => 'application/json' },
      body: { choices: [{ message: { content: content } }] }.to_json
    )
  end

  it 'rejects unauthenticated requests' do
    post "#{base}/chat_reply", params: { message: 'hi' }, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'rejects users from another account' do
    outsider = create(:user)
    post "#{base}/chat_reply", params: { message: 'hi' }, headers: outsider.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'lets only administrators save the brand profile, stored on the account' do
    post "#{base}/save_profile", params: { brand_name: 'X' }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)

    post "#{base}/save_profile", params: { brand_name: 'Hana', hard_bans: 'giảm 50%, rẻ nhất' },
                                 headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    profile = account.reload.custom_attributes.dig('brand_growth', 'profile')
    expect(profile).to include('brand_name' => 'Hana', 'hard_bans' => ['giảm 50%', 'rẻ nhất'])
  end

  it 'returns an AI reply with hard bans removed' do
    stub_ai('Sản phẩm trị khỏi 100% nhé')
    post "#{base}/chat_reply", params: { message: 'có tốt không?' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['reply']).not_to include('trị khỏi 100%')
    expect(response.parsed_body['guardrail_triggered']).to be(true)
  end

  it 'returns 503 when AI is not configured' do
    with_modified_env(AGENTGW_API_KEY: nil, CUSTOM_AI_API_KEY: nil) do
      post "#{base}/chat_reply", params: { message: 'hi' }, headers: agent.create_new_auth_token, as: :json
    end

    expect(response).to have_http_status(:service_unavailable)
  end

  describe 'when the AI provider fails' do
    { 'rejects the key' => 401, 'is down' => 503 }.each do |label, status|
      it "returns 502 ai_unavailable when the provider #{label}" do
        stub_request(:post, gateway).to_return(status: status)
        post "#{base}/chat_reply", params: { message: 'hi' }, headers: agent.create_new_auth_token, as: :json

        expect(response).to have_http_status(:bad_gateway)
        expect(response.parsed_body).to eq('error' => 'ai_unavailable')
      end
    end

    it 'ai_health says configured but not available after a 502, for the assistant as well' do
      get "#{base}/ai_health", headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body).to include('configured' => true, 'available' => true)

      stub_request(:post, gateway).to_return(status: 401)
      assistant = "/api/v1/accounts/#{account.id}/kchat/assistant"
      post assistant, params: { message: 'hi', mode: 'help' }, headers: agent.create_new_auth_token, as: :json
      expect(response).to have_http_status(:bad_gateway)

      get "#{base}/ai_health", headers: agent.create_new_auth_token, as: :json
      expect(response.parsed_body).to include('configured' => true, 'available' => false)
      expect(response.parsed_body['last_failure_at']).to be_present
    end

    it 'returns 502 ai_unavailable when the provider cannot be reached' do
      stub_request(:post, gateway).to_timeout
      post "#{base}/repurpose", params: { topic: 'Da khô' }, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body).to eq('error' => 'ai_unavailable')
    end
  end

  it 'creates a pending content job that an admin can approve once' do
    stub_ai({ angles: [{ angle: 'A', hook: 'H', body: 'B', cta: 'C' }] }.to_json)
    post "#{base}/repurpose", params: { topic: 'Da khô mùa đông' }, headers: agent.create_new_auth_token, as: :json
    job = response.parsed_body
    expect(job['status']).to eq('pending')
    expect(job['angles'].first).to include('hook' => 'H')

    post "#{base}/approve_job", params: { job_id: job['id'], job_action: 'approve' }, headers: admin.create_new_auth_token, as: :json
    expect(response.parsed_body['status']).to eq('approved')

    post "#{base}/approve_job", params: { job_id: job['id'], job_action: 'reject' }, headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'transitions individual angles independently when angle_index is provided' do
    stub_ai({ angles: [{ angle: 'A', hook: 'H1', body: 'B1', cta: 'C1' },
                       { angle: 'B', hook: 'H2', body: 'B2', cta: 'C2' }] }.to_json)
    post "#{base}/repurpose", params: { topic: 'Nến thơm' }, headers: admin.create_new_auth_token, as: :json
    job = response.parsed_body

    post "#{base}/approve_job", params: { job_id: job['id'], job_action: 'approve', angle_index: 0 },
                                headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig('angles', 0, 'status')).to eq('approved')

    post "#{base}/approve_job", params: { job_id: job['id'], job_action: 'reject', angle_index: 1 },
                                headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig('angles', 1, 'status')).to eq('rejected')
    expect(response.parsed_body['status']).to eq('approved')

    post "#{base}/approve_job", params: { job_id: job['id'], job_action: 'approve', angle_index: 9 },
                                headers: admin.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  describe 'input size limits' do
    let(:headers) { agent.create_new_auth_token }

    def chat(params)
      post "#{base}/chat_reply", params: params, headers: headers, as: :json
    end

    def sent_messages
      sent = nil
      expect(a_request(:post, gateway).with { |req| (sent = JSON.parse(req.body)['messages']) }).to have_been_made.once
      sent
    end

    it 'rejects a message over 2000 characters with 422 message_too_long and never calls the AI' do
      stub = stub_ai('ok')
      chat(message: 'a' * 2001)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('message_too_long')
      expect(stub).not_to have_been_requested
    end

    it 'accepts a message of exactly 2000 characters' do
      stub_ai('ok')
      chat(message: 'a' * 2000)

      expect(response).to have_http_status(:ok)
    end

    it 'keeps only the last 6 history items and truncates each content to 2000 characters' do
      stub_ai('ok')
      history = (1..9).map { |i| { role: 'user', content: "#{i}#{'x' * 3000}" } }
      chat(message: 'hi', history: history)

      expect(response).to have_http_status(:ok)
      turns = sent_messages.drop(1) # drop the system prompt
      expect(turns.size).to eq(7)
      expect(turns.first(6).map { |t| t['content'][0] }).to eq(%w[4 5 6 7 8 9])
      expect(turns.map { |t| t['content'].length }.max).to eq(2000)
    end

    it 'accepts history of exactly 6 items with 2000 characters each' do
      stub_ai('ok')
      history = Array.new(6) { { role: 'assistant', content: 'y' * 2000 } }
      chat(message: 'a' * 2000, history: history)

      expect(response).to have_http_status(:ok)
      expect(sent_messages.drop(1).sum { |t| t['content'].length }).to eq(7 * 2000)
    end

    it 'treats history sent as an object instead of an array as empty' do
      stub_ai('ok')
      post "#{base}/chat_reply", params: { message: 'hi', history: { '0' => { role: 'user', content: 'x' } } },
                                 headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(sent_messages.size).to eq(2) # system prompt + the message only
    end

    it 'treats history sent as a string as empty' do
      stub_ai('ok')
      post "#{base}/chat_reply", params: { message: 'hi', history: 'nope' }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
    end

    it 'rejects a topic over 300 characters with 422 topic_too_long' do
      stub = stub_ai('{}')
      post "#{base}/repurpose", params: { topic: 't' * 301 }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('topic_too_long')
      expect(stub).not_to have_been_requested
    end

    it 'accepts a topic of exactly 300 characters' do
      stub_ai({ angles: [{ angle: 'A', hook: 'H', body: 'B', cta: 'C' }] }.to_json)
      post "#{base}/repurpose", params: { topic: 't' * 300 }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
    end
  end

  it 'updates an angle with hard_bans sanitization and injects positioning into prompt' do
    account.update!(
      custom_attributes: {
        'brand_growth' => {
          'profile' => { 'brand_name' => 'Hana', 'positioning' => 'Nến sạch 100%', 'hard_bans' => ['rẻ nhất'] },
          'jobs' => []
        }
      }
    )
    stub_ai({ angles: [{ angle: 'A', hook: 'H1', body: 'B1', cta: 'C1' }] }.to_json)
    post "#{base}/repurpose", params: { topic: 'Nến mới' }, headers: admin.create_new_auth_token, as: :json
    expect(a_request(:post, gateway).with { |req| req.body.include?('Nến sạch 100%') }).to have_been_made.once
    job = response.parsed_body

    patch "#{base}/update_angle",
          params: { job_id: job['id'], angle_index: 0, hook: 'Hàng rẻ nhất quả đất', body: 'Sáp ong tự nhiên' },
          headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig('angles', 0, 'hook')).not_to include('rẻ nhất')
    expect(response.parsed_body.dig('angles', 0, 'body')).to eq('Sáp ong tự nhiên')
  end

  it 'manages content calendar items with hard_bans sanitization' do
    account.update!(
      custom_attributes: {
        'brand_growth' => { 'profile' => { 'hard_bans' => ['rẻ nhất'] }, 'jobs' => [] }
      }
    )
    post "#{base}/save_calendar_item",
         params: { title: 'Bài Tết', channel: 'tiktok', status: 'scheduled', scheduled_for: '2026-12-01', hook: 'Rẻ nhất' },
         headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    item_id = response.parsed_body.dig('item', 'id')
    expect(response.parsed_body.dig('item', 'hook')).not_to include('Rẻ nhất')

    get "#{base}/overview", headers: agent.create_new_auth_token, as: :json
    expect(response.parsed_body['calendar'].size).to eq(1)

    delete "#{base}/delete_calendar_item", params: { id: item_id }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    get "#{base}/overview", headers: agent.create_new_auth_token, as: :json
    expect(response.parsed_body['calendar']).to eq([])
  end
end
