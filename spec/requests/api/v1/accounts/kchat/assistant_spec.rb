# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat assistant API', type: :request do
  let(:account) { create(:account) }
  let(:other_account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/assistant" }
  let(:gateway) { 'https://agentgw.cloud/v1/chat/completions' }
  let(:headers) { agent.create_new_auth_token }
  let(:guide) { Rails.root.join('config/kalo/assistant_guide.vi.md').read.strip }

  around { |ex| with_modified_env(AGENTGW_API_KEY: 'test-key', AI_PROVIDER: 'agentgw') { ex.run } }

  def stub_ai(content = 'Xin chào')
    stub_request(:post, gateway).to_return(
      status: 200, headers: { 'Content-Type' => 'application/json' },
      body: { choices: [{ message: { content: content } }] }.to_json
    )
  end

  def ask(params = {})
    post url, params: { message: 'hi', mode: 'help' }.merge(params), headers: headers, as: :json
  end

  def sent_messages
    bodies = []
    expect(WebMock).to(have_requested(:post, gateway).with { |req| bodies << JSON.parse(req.body) })
    bodies.last['messages']
  end

  def system_prompt
    sent_messages.first['content']
  end

  def sell(acc, name, price)
    product = Kchat::Product.create!(account: acc, name: name, price: price)
    Kchat::Order.create_with_items!(account: acc, attributes: { source: 'manual', payment_method: 'cash' },
                                    items: [{ product_id: product.id, name: name, unit_price: price, quantity: 1 }])
  end

  it 'rejects unauthenticated requests' do
    post url, params: { message: 'hi', mode: 'help' }, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it 'rejects users from another account' do
    post url, params: { message: 'hi', mode: 'help' }, headers: create(:user, account: other_account).create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  describe 'help mode' do
    it 'returns the reply and puts the Kalo usage guide in the system prompt' do
      stub_ai('Vào Cài đặt nhé')
      ask(message: 'Làm sao nối Zalo?')

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq('reply' => 'Vào Cài đặt nhé')
      expect(system_prompt).to include(guide)
      expect(sent_messages.last).to eq('role' => 'user', 'content' => 'Làm sao nối Zalo?')
    end

    it 'defaults to help when mode is omitted' do
      stub_ai
      post url, params: { message: 'hi' }, headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(system_prompt).to include(guide)
    end

    it 'keeps only the last 6 history turns, truncated to 2000 characters' do
      stub_ai
      history = (1..8).map { |i| { role: i.odd? ? 'user' : 'assistant', content: "t#{i}#{'x' * 2500}" } }
      ask(history: history)

      turns = sent_messages[1..-2]
      expect(turns.size).to eq(6)
      expect(turns.first['content']).to start_with('t3')
      expect(turns.map { |t| t['content'].length }.uniq).to eq([2000])
    end

    it 'does not include shop numbers' do
      sell(account, 'Áo thun', 123_456)
      stub_ai
      ask

      expect(system_prompt).not_to include('123456')
    end
  end

  describe 'insights mode' do
    it 'includes a 7-day summary of the current account only' do
      sell(account, 'Áo thun', 123_456)
      sell(other_account, 'Bí mật khác', 987_654)
      stub_ai
      ask(mode: 'insights', message: 'Tuần này thế nào?')

      expect(system_prompt).to include('123456', 'Áo thun', '"range":"7d"')
      expect(system_prompt).not_to include('987654')
      expect(system_prompt).not_to include('Bí mật khác')
    end

    it 'tells the model not to invent numbers' do
      stub_ai
      ask(mode: 'insights')
      expect(system_prompt).to match(/không bịa/i)
    end
  end

  describe 'write mode' do
    before do
      profile = { 'brand_name' => 'Hana Shop', 'tone' => 'thân thiện', 'hard_bans' => ['rẻ nhất'] }
      account.update!(custom_attributes: { 'brand_growth' => { 'profile' => profile } })
      other_account.update!(custom_attributes: { 'brand_growth' => { 'profile' => { 'brand_name' => 'Đối thủ' } } })
    end

    it 'includes the brand profile and hard bans, and no other account profile' do
      stub_ai
      ask(mode: 'write', message: 'Viết bài đăng')

      expect(system_prompt).to include('Hana Shop', 'thân thiện', 'rẻ nhất')
      expect(system_prompt).not_to include('Đối thủ')
    end

    it 'ignores a non-hash profile' do
      account.update!(custom_attributes: { 'brand_growth' => { 'profile' => 'oops' } })
      stub_ai
      ask(mode: 'write')
      expect(response).to have_http_status(:ok)
    end

    it 'caps each profile field to 500 characters' do
      account.update!(custom_attributes: { 'brand_growth' => { 'profile' => { 'brand_name' => 'Hana', 'usp' => "#{'u' * 500}ENDMARK" } } })
      stub_ai
      ask(mode: 'write')
      expect(system_prompt).to include('u' * 500)
      expect(system_prompt).not_to include('ENDMARK')
    end

    it 'strips hard-banned phrases from the reply' do
      stub_ai('Giá rẻ nhất thị trường, trị khỏi 100%')
      ask(mode: 'write')

      expect(response.parsed_body['reply']).not_to include('rẻ nhất')
      expect(response.parsed_body['reply']).not_to include('trị khỏi 100%')
    end
  end

  describe 'log filtering' do
    let(:filter) { ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters) }

    it 'filters message and history content for this endpoint only' do
      params = { 'controller' => 'api/v1/accounts/kchat/assistant', 'message' => 'bí mật',
                 'history' => [{ 'role' => 'user', 'content' => 'riêng tư' }] }
      filtered = filter.filter(params.deep_dup)
      expect(filtered['message']).to eq('[FILTERED]')
      expect(filtered['history'].first).to include('content' => '[FILTERED]', 'role' => 'user')
    end

    it 'leaves other endpoints untouched' do
      params = { 'controller' => 'api/v1/accounts/conversations/messages', 'message' => 'hello', 'content' => 'hi' }
      expect(filter.filter(params.deep_dup)).to include('message' => 'hello', 'content' => 'hi')
    end
  end

  describe 'input limits' do
    it 'rejects a message over 2000 characters with 422' do
      ask(message: 'x' * 2001)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('message_too_long')
    end

    it 'rejects a blank message with 422' do
      ask(message: '  ')
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('message_required')
    end

    it 'rejects an unknown mode with 422' do
      ask(mode: 'hack')
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('invalid_mode')
    end

    it 'maps an oversized prompt to 422 prompt_too_large' do
      llm = instance_double(Ai::CustomLlmService)
      allow(Ai::CustomLlmService).to receive(:new).and_return(llm)
      allow(llm).to receive(:complete).and_raise(Ai::CustomLlmService::PromptTooLargeError)
      ask
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('error' => 'prompt_too_large')
    end

    it 'keeps the worst-case prompt (guide + full history + message) under the AI cap' do
      stub_ai
      history = Array.new(6) { |i| { role: i.even? ? 'user' : 'assistant', content: 'y' * 2000 } }
      ask(history: history, message: 'z' * 2000)
      expect(response).to have_http_status(:ok)
    end
  end

  it 'answers 429 rate_limited after the per-account limit, independent of other accounts' do
    stub_ai
    limit = ENV.fetch('KCHAT_ASSISTANT_LIMIT', '30').to_i
    limit.times { ask }
    expect(response).to have_http_status(:ok)

    ask
    expect(response).to have_http_status(:too_many_requests)
    expect(response.parsed_body).to eq('error' => 'rate_limited')

    other = create(:user, account: other_account)
    post "/api/v1/accounts/#{other_account.id}/kchat/assistant", params: { message: 'hi' }, headers: other.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
  end

  it 'answers 403 subscription_expired after the trial, without calling the AI' do
    account.update_columns(created_at: 60.days.ago) # rubocop:disable Rails/SkipsModelValidations
    ask
    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq('subscription_expired')
    expect(WebMock).not_to have_requested(:post, gateway)
  end

  it 'answers 503 ai_not_configured without a key' do
    with_modified_env(AGENTGW_API_KEY: nil, CUSTOM_AI_API_KEY: nil) { ask }
    expect(response).to have_http_status(:service_unavailable)
    expect(response.parsed_body['error']).to eq('ai_not_configured')
  end

  { 'rejects the key' => 401, 'is down' => 503 }.each do |label, status|
    it "answers 502 ai_unavailable when the provider #{label}" do
      stub_request(:post, gateway).to_return(status: status)
      ask
      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body).to eq('error' => 'ai_unavailable')
    end
  end
end
