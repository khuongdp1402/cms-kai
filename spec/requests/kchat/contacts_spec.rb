# spec/requests/kchat/contacts_spec.rb
#
# Contract tests cho Contacts API — CMS cần đọc/viết contacts thường xuyên.

require 'rails_helper'

RSpec.describe 'KChat Contacts Contract', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:auth_headers) do
    post '/auth/sign_in', params: { email: agent.email, password: agent.password }, as: :json
    response.headers.slice('access-token', 'client', 'uid', 'token-type', 'expiry')
  end
  let(:contact) { create(:contact, account: account, name: 'Test Contact', email: 'test@example.com') }

  describe 'GET /api/v1/accounts/:account_id/contacts' do
    it 'returns paginated contacts' do
      contact
      get "/api/v1/accounts/#{account.id}/contacts",
          headers: auth_headers,
          params: { page: 1 }

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to have_key('payload')
      expect(body).to have_key('meta')
    end
  end

  describe 'GET /api/v1/accounts/:account_id/contacts/search' do
    it 'searches contacts by name' do
      contact
      get "/api/v1/accounts/#{account.id}/contacts/search",
          headers: auth_headers,
          params: { q: 'Test Contact' }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['payload']).to be_an(Array)
    end
  end

  describe 'POST /api/v1/accounts/:account_id/contacts' do
    it 'creates a new contact' do
      post "/api/v1/accounts/#{account.id}/contacts",
           headers: auth_headers,
           params: { name: 'New Contact', email: 'new@example.com', phone_number: '+84901234567' },
           as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig('contact', 'name')).to eq('New Contact')
    end
  end

  describe 'GET /api/v1/accounts/:account_id/contacts/:id' do
    it 'returns contact details' do
      get "/api/v1/accounts/#{account.id}/contacts/#{contact.id}",
          headers: auth_headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to include('name', 'email', 'id', 'additional_attributes')
    end
  end

  describe 'GET /api/v1/accounts/:account_id/contacts/:id/conversations' do
    it 'returns contact conversations' do
      get "/api/v1/accounts/#{account.id}/contacts/#{contact.id}/conversations",
          headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to have_key('payload')
    end
  end
end
