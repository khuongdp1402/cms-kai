require 'rails_helper'

RSpec.describe 'Kchat Bot Config API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v1/accounts/#{account.id}/kchat/bot_config" }

  it 'returns defaults on GET and allows only admin to update' do
    get url, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include('enabled' => false, 'rules' => [])

    patch url, params: { enabled: true }, headers: agent.create_new_auth_token, as: :json
    expect(response).to have_http_status(:unauthorized)

    product = Kchat::Product.create!(account: account, name: 'Tour Đà Lạt', price: 2_000_000)
    patch url, params: {
      enabled: true,
      welcome_enabled: true,
      welcome_message: 'Chào {{contact.name}}',
      rules: [{
        name: 'Hỏi tour',
        keywords: ['tour', 'đà lạt'],
        reply: 'Em gửi lịch trình ạ',
        product_ids: [product.id],
        assign_labels: ['tour']
      }]
    }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['enabled']).to be(true)
    expect(response.parsed_body['rules'].first).to include('name' => 'Hỏi tour', 'product_ids' => [product.id])
  end
end
