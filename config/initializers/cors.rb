# config/initializers/cors.rb
# ref: https://github.com/cyu/rack-cors
#
# KChat: CORS được cấu hình cho chế độ headless CMS.
# - Dùng ALLOWED_ORIGINS để whitelist frontend CMS domain.
# - Action Cable origins được cấu hình riêng qua ACTION_CABLE_ALLOWED_ORIGINS.
# - Trong môi trường dev, '*' được cho phép để tiện phát triển.

# Đọc danh sách origins được phép từ ENV, hỗ trợ regex (bắt đầu bằng 'r/')
def parse_allowed_origins(env_key)
  raw = ENV.fetch(env_key, '')
  return '*' if raw.blank? && (Rails.env.development? || Rails.env.test?)

  origins = raw.split(',').map(&:strip).reject(&:empty?)
  return '*' if origins.empty?

  origins.map do |o|
    if o.start_with?('r/')
      Regexp.new(o[2..])
    else
      o
    end
  end
end

# font cors issue with CDN
# Ref: https://stackoverflow.com/questions/56960709/rails-font-cors-policy
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins parse_allowed_origins('ALLOWED_ORIGINS')

    resource '/packs/*', headers: :any, methods: [:get, :options]
    resource '/audio/*', headers: :any, methods: [:get, :options]
    # Make the public endpoints accessible to the frontend
    resource '/public/api/*', headers: :any, methods: :any

    if ActiveModel::Type::Boolean.new.cast(ENV.fetch('CW_API_ONLY_SERVER', false)) || Rails.env.development?
      resource '*', headers: :any, methods: :any, expose: %w[access-token client uid expiry token-type]
    end

    if ActiveModel::Type::Boolean.new.cast(ENV.fetch('ENABLE_API_CORS', false))
      resource '/api/*', headers: :any, methods: :any, expose: %w[access-token client uid expiry token-type]
    end
  end
end

################################################
######### Action Cable Related Config ##########
################################################

# Action Cable origins từ ENV — hỗ trợ nhiều origins ngăn cách bởi dấu phẩy.
# Ví dụ: ACTION_CABLE_ALLOWED_ORIGINS=https://cms.ktech.vn,https://api.ktech.vn
cable_origins_raw = ENV.fetch('ACTION_CABLE_ALLOWED_ORIGINS', '')
if cable_origins_raw.present?
  cable_origins = cable_origins_raw.split(',').map do |o|
    o.strip.start_with?('r/') ? Regexp.new(o.strip[2..]) : o.strip
  end
  Rails.application.config.action_cable.allowed_request_origins = cable_origins
elsif Rails.env.development? || Rails.env.test?
  Rails.application.config.action_cable.disable_request_forgery_protection = true
else
  # Production mà không set ACTION_CABLE_ALLOWED_ORIGINS thì vẫn tắt check để tương thích
  # Sau khi set domain thật thì bật lại
  Rails.application.config.action_cable.disable_request_forgery_protection = true
end

# Allow CSRF token validation when running behind SSL-terminating reverse proxies (Nginx / Ingress)
Rails.application.config.action_controller.forgery_protection_origin_check = false
