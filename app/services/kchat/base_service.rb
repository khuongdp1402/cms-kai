# app/services/kchat/base_service.rb
#
# KChat: Base class cho tất cả services trong namespace KChat.
# Convention: mỗi service có method #perform và trả về ServiceResult.

module Kchat
  class BaseService
    attr_reader :current_account, :current_user, :params

    def initialize(current_account:, current_user: nil, params: {})
      @current_account = current_account
      @current_user = current_user
      @params = params
    end

    # Gọi service và bắt exception thành ServiceResult lỗi
    def self.call(...)
      new(...).perform
    rescue StandardError => e
      Rails.logger.error("[KChat::#{name}] Error: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
      ServiceResult.failure(error: e.message)
    end

    private

    def perform
      raise NotImplementedError, "#{self.class.name}#perform must be implemented"
    end
  end

  # Value object cho kết quả của service
  class ServiceResult
    attr_reader :data, :error

    def initialize(success:, data: nil, error: nil)
      @success = success
      @data = data
      @error = error
    end

    def self.success(data: nil)
      new(success: true, data: data)
    end

    def self.failure(error:, data: nil)
      new(success: false, error: error, data: data)
    end

    def success?
      @success
    end

    def failure?
      !@success
    end
  end
end
