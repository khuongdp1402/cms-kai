# frozen_string_literal: true

class ZaloPersonal::ConnectionAttempts::RefreshQrService
  def initialize(attempt:)
    @attempt = attempt
  end

  def perform
    @attempt.with_lock { perform_locked }
  end

  private

  def perform_locked
    return unavailable_result if @attempt.consumed? || @attempt.cancelled?

    resumed = resume_active_flow
    return resumed if resumed

    client = ZaloPersonal::BridgeClient.new
    res = client.create_qr_flow(@attempt.bridge_integration_id)

    if res[:success]
      status = ZaloPersonal::ConnectionAttempts::ShowService::STATUS_MAP.fetch(res[:data]['status'], :pending)
      error_code = res[:data]['error_code'].presence || (status == :failed ? 'zalo_login_failed' : nil)

      @attempt.update!(
        bridge_session_id: res[:data]['flow_id'],
        status: status,
        error_code: error_code,
        expires_at: Time.zone.parse(res[:data].fetch('expires_at'))
      )
      { success: true, attempt: @attempt, qr_data_url: res[:data]['qr_data_url'], expires_at: @attempt.expires_at }
    else
      { success: false, error: res[:error] || 'Failed to refresh QR code' }
    end
  end

  def resume_active_flow
    return unless @attempt.active? && @attempt.bridge_session_id.present?

    result = ZaloPersonal::ConnectionAttempts::ShowService.new(attempt: @attempt).perform
    return result unless result[:success]
    return unless result[:attempt].active?

    result.merge(expires_at: @attempt.expires_at, reused: true)
  end

  def unavailable_result
    { success: false, error: 'Cannot refresh consumed or cancelled attempt' }
  end
end
