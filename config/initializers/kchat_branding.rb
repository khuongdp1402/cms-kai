# config/initializers/kchat_branding.rb
# P6-04: KChat Branding override
#
# Thay thế các hằng số/chuỗi Chatwoot bằng KChat.
# Chỉ ảnh hưởng tới user-facing strings (email, API responses, v.v.)
# KHÔNG thay đổi class names hay module names để không phá Chatwoot core.

Rails.application.config.after_initialize do
  # App name hiển thị trong email subjects, page titles, v.v.
  if defined?(GlobalConfig)
    GlobalConfig.prepend(Module.new do
      def app_name
        ENV.fetch('APP_NAME', 'KChat')
      end
    end)
  end

  # Nếu tồn tại InstallationConfig, ghi đè app_name mặc định
  if defined?(InstallationConfig)
    InstallationConfig.prepend(Module.new do
      def app_name
        ENV.fetch('APP_NAME', 'KChat')
      end
    end)
  end
end

# Đặt APP_NAME mặc định nếu chưa có trong ENV
ENV['APP_NAME'] ||= 'KChat'
