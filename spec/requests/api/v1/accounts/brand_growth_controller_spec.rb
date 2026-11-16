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
end
