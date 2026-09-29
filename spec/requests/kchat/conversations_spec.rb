# spec/requests/kchat/conversations_spec.rb
#
# Contract tests cho Conversations API — đây là endpoint quan trọng nhất của CMS.
# Mục đích: đảm bảo khi merge upstream Chatwoot, các contract không bị phá vỡ.

require 'rails_helper'

RSpec.describe 'KChat Conversations Contract', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:auth_headers) do
    post '/auth/sign_in', params: { email: agent.email, password: agent.password }, as: :json
    response.headers.slice('access-token', 'client', 'uid', 'token-type', 'expiry')
  end
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account) }
  let(:conversation) do
    create(:conversation, account: account, inbox: inbox, assignee: agent, contact: contact)
  end

  describe 'GET /api/v1/accounts/:account_id/conversations' do
    it 'returns 200 with conversations list' do
      conversation
      get "/api/v1/accounts/#{account.id}/conversations",
          headers: auth_headers,
          params: { page: 1 }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to have_key('data')
      expect(response.parsed_body['data']).to have_key('meta')
      expect(response.parsed_body['data']).to have_key('payload')
    end

    it 'returns 401 without auth' do
      get "/api/v1/accounts/#{account.id}/conversations"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/accounts/:account_id/conversations/:id' do
    it 'returns conversation details with required fields' do
      get "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}",
          headers: auth_headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to include('id', 'inbox_id', 'contact', 'status', 'assignee', 'meta')
    end
  end

  describe 'PATCH /api/v1/accounts/:account_id/conversations/:id/update' do
    it 'can update conversation status' do
      patch "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}",
            headers: auth_headers,
            params: { status: 'resolved' },
            as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['current_status']).to eq('resolved')
    end
  end

  describe 'GET /api/v1/accounts/:account_id/conversations/:id/messages' do
    it 'returns messages list' do
      get "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/messages",
          headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to have_key('payload')
    end
  end

  describe 'POST /api/v1/accounts/:account_id/conversations/:id/messages' do
    it 'creates a new outgoing message' do
      post "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/messages",
           headers: auth_headers,
           params: { content: 'Hello from KChat CMS!', message_type: 'outgoing', private: false },
           as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['content']).to eq('Hello from KChat CMS!')
    end
  end
end
