# app/controllers/kchat/base_controller.rb
#
# KChat namespace: Base controller cho tất cả API endpoints của KChat.
# Kế thừa từ Api::V1::BaseController để hưởng authentication, error handling.
# Thêm các concern riêng của KChat (logging, rate limiting, v.v.)

module Kchat
  class BaseController < Api::V1::BaseController
    before_action :log_kchat_request

    private

    def log_kchat_request
      return unless Rails.env.development?

      Rails.logger.debug(
        "[KChat API] #{request.method} #{request.path} | " \
        "account=#{Current.account&.id} user=#{Current.user&.id}"
      )
    end

    # Trả về lỗi chuẩn KChat cho enterprise features chưa có
    def not_implemented(feature_name)
      render json: {
        error: "#{feature_name} is not available in this plan",
        code: 'FEATURE_NOT_IMPLEMENTED'
      }, status: :not_implemented
    end
  end
end
