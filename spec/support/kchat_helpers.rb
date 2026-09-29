# spec/support/kchat_helpers.rb
#
# KChat test helpers: Tiện ích dùng chung cho request specs trong namespace KChat.

module KchatHelpers
  # Đăng nhập và trả về auth headers cho devise_token_auth
  def kchat_auth_headers(user)
    post '/auth/sign_in',
         params: { email: user.email, password: user.password },
         as: :json
    response.headers.slice('access-token', 'client', 'uid', 'token-type', 'expiry')
  end

  # Tạo account + agent + agent_token cho test nhanh
  def create_kchat_test_context
    account = create(:account)
    agent = create(:user, account: account, role: :agent)
    [account, agent, kchat_auth_headers(agent)]
  end

  # Request wrapper tự động gán headers
  def kchat_get(path, headers: {}, **options)
    get path, headers: headers, **options
  end

  def kchat_post(path, headers: {}, **options)
    post path, headers: headers, as: :json, **options
  end
end

RSpec.configure do |config|
  config.include KchatHelpers, type: :request
end
