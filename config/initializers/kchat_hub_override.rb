# config/initializers/kchat_hub_override.rb
#
# KChat: Vô hiệu hoá toàn bộ telemetry và version-check gửi đến Chatwoot Hub.
# ChatwootHub.sync_with_hub gọi ra internet để báo cáo số liệu cài đặt,
# check version mới và nhận thông báo từ Chatwoot. Trong môi trường KTech
# chúng ta muốn toàn quyền kiểm soát dữ liệu.
#
# Không xoá module gốc (lib/chatwoot_hub.rb) để tránh merge conflict với upstream.
# Thay vào đó, override các method cụ thể bằng Module#prepend.

module KChat
  module HubOverride
    # Tắt sync với Chatwoot Hub (telemetry + version check)
    def sync_with_hub
      Rails.logger.debug('[KChat] ChatwootHub#sync_with_hub suppressed — telemetry disabled')
      {}
    end

    # Tắt đăng ký instance lên Chatwoot Hub
    def register_instance(*)
      Rails.logger.debug('[KChat] ChatwootHub#register_instance suppressed — telemetry disabled')
      {}
    end

    # Tắt gửi push notification qua Chatwoot Hub (dùng FCM trực tiếp nếu cần)
    def send_push(*)
      Rails.logger.debug('[KChat] ChatwootHub#send_push suppressed')
      nil
    end

    def send_push_with_response(*)
      Rails.logger.debug('[KChat] ChatwootHub#send_push_with_response suppressed')
      nil
    end
  end
end

# Chỉ apply override khi module ChatwootHub tồn tại (tránh lỗi khi upstream thay đổi)
if defined?(ChatwootHub)
  ChatwootHub.singleton_class.prepend(KChat::HubOverride)
  Rails.logger.info('[KChat] ChatwootHub telemetry overrides applied')
end
