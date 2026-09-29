# config/initializers/super_admin_guard.rb
# P7-02: Chặn truy cập /super_admin từ bên ngoài.
#
# SuperAdmin của Chatwoot mặc định chỉ được bảo vệ bằng auth.
# Chúng ta chặn thêm bằng middleware nếu không phải localhost hoặc có header đặc biệt.
# Cho phép qua nếu ALLOW_SUPER_ADMIN=true (dùng trong dev/migration).

Rails.application.config.middleware.use(Class.new do
  SUPER_ADMIN_PREFIX = '/super_admin'.freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)
    if request.path.start_with?(SUPER_ADMIN_PREFIX)
      allow_super_admin = ENV['ALLOW_SUPER_ADMIN'] == 'true'
      is_localhost = %w[127.0.0.1 ::1].include?(request.ip)

      unless allow_super_admin || is_localhost
        Rails.logger.warn("[KChat] Blocked /super_admin access from IP: #{request.ip}")
        return [
          403,
          { 'Content-Type' => 'application/json' },
          ['{"error":"Super Admin access is not available on this deployment.","code":"SUPER_ADMIN_DISABLED"}']
        ]
      end
    end

    @app.call(env)
  end
end)
