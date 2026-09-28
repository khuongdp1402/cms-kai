# frozen_string_literal: true

class ZaloPersonal::ConnectionAttempts::ShowService
  STATUS_MAP = {
    'pending' => :pending,
    'qr_ready' => :qr_ready,
    'scanned' => :scanned,
    'awaiting_confirmation' => :awaiting_confirmation,
    'authenticated' => :authenticated,
    'expired' => :expired,
    'declined' => :declined,
    'failed' => :failed
  }.freeze

  def initialize(attempt:)
    @attempt = attempt
  end

  def perform
    return success_result if final_state?
    return expire_attempt if @attempt.expired?
    return success_result if @attempt.bridge_session_id.blank?

    response = ZaloPersonal::BridgeClient.new.qr_flow_status(@attempt.bridge_integration_id, @attempt.bridge_session_id)
    return mark_flow_unavailable(response) if response[:status] == 404
    return { success: false, error: response[:error] || 'Unable to read QR flow status from bridge' } unless response[:success]

    sync_flow(response[:data])
  end

  private

  def final_state?
    @attempt.authenticated? || @attempt.consumed? || @attempt.cancelled? ||
      @attempt.status == 'expired' || @attempt.declined? || @attempt.failed?
  end

  def expire_attempt
    @attempt.update!(status: :expired)
    success_result
  end

  def sync_flow(flow)
    mapped_status = STATUS_MAP.fetch(flow['status'], @attempt.status)
    attributes = {
      status: mapped_status,
      error_code: flow['error_code'].presence || (mapped_status == :failed ? 'zalo_login_failed' : nil)
    }
    attributes[:authenticated_at] = flow['authenticated_at'] if flow['authenticated_at'].present?
    attributes[:profile] = flow['profile'] if flow['profile'].present?
    attributes[:capabilities] = flow['capabilities'] if flow['capabilities'].present?
    @attempt.update!(attributes)

    success_result(qr_data_url: flow['qr_data_url'])
  end

  def mark_flow_unavailable(response)
    @attempt.update!(status: :failed, error_code: 'qr_flow_unavailable')
    Rails.logger.warn(
      "Zalo Personal QR flow #{@attempt.bridge_session_id} is unavailable: #{response[:error] || 'not found'}"
    )
    success_result
  end

  def success_result(qr_data_url: nil)
    { success: true, attempt: @attempt, qr_data_url: qr_data_url }
  end
end
