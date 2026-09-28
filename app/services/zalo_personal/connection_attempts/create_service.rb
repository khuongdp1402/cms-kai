# frozen_string_literal: true

class ZaloPersonal::ConnectionAttempts::CreateService
  def initialize(account:, user:, target_inbox: nil, purpose: :create_channel)
    @account = account
    @user = user
    @target_inbox = target_inbox
    @purpose = purpose
  end

  def perform
    @account.with_lock { perform_locked }
  rescue StandardError => e
    { success: false, error: e.message }
  end

  private

  def perform_locked
    attempt = reusable_attempt
    return resume_attempt(attempt) if attempt

    attempt = create_attempt
    response = ZaloPersonal::BridgeClient.new.create_qr_flow(attempt.bridge_integration_id)

    return qr_flow_created(attempt, response[:data]) if response[:success]

    attempt.update!(status: :failed, error_code: response[:error])
    { success: false, error: response[:error] || 'Failed to initialize QR flow with bridge' }
  end

  def reusable_attempt
    attempts = @account.zalo_personal_connection_attempts.active.where(
      requested_by: @user,
      purpose: @purpose
    )
    attempts = if @target_inbox
                 attempts.where(target_inbox: @target_inbox)
               else
                 attempts.where(target_inbox_id: nil)
               end

    attempts.order(created_at: :desc).first
  end

  def resume_attempt(attempt)
    if attempt.bridge_session_id.blank?
      attempt.update!(status: :failed, error_code: 'qr_flow_unavailable')
      return perform_locked
    end

    result = ZaloPersonal::ConnectionAttempts::ShowService.new(attempt: attempt).perform
    return result unless result[:success]

    attempt = result[:attempt]
    return perform_locked unless attempt.active?

    result.merge(expires_at: attempt.expires_at, reused: true)
  end

  def create_attempt
    @account.zalo_personal_connection_attempts.create!(
      requested_by: @user,
      target_inbox: @target_inbox,
      purpose: @purpose,
      status: :pending
    )
  end

  def qr_flow_created(attempt, flow)
    status = ZaloPersonal::ConnectionAttempts::ShowService::STATUS_MAP.fetch(flow['status'], :pending)
    error_code = flow['error_code'].presence || (status == :failed ? 'zalo_login_failed' : nil)

    attempt.update!(
      bridge_session_id: flow['flow_id'],
      status: status,
      error_code: error_code,
      expires_at: Time.zone.parse(flow.fetch('expires_at'))
    )

    { success: true, attempt: attempt, qr_data_url: flow['qr_data_url'], expires_at: attempt.expires_at }
  end
end
