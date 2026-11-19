# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Kchat comment rules API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/comment_rules" }

  it 'allows agents to view rules and restricts updates to administrators' do
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['rules']).to include('enabled' => true, 'auto_hide_phone' => true)

    patch url, params: { auto_private_reply: true }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)

    patch url,
          params: {
            enabled: true,
            auto_hide_phone: true,
            hide_keywords: 'sỉ, CTV, đại lý',
            auto_private_reply: true,
            private_reply_template: 'Chào {{name}}, check inbox!'
          },
          headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['rules']).to include(
      'auto_private_reply' => true,
      'hide_keywords' => ['sỉ', 'CTV', 'đại lý'],
      'private_reply_template' => 'Chào {{name}}, check inbox!'
    )
  end
end
