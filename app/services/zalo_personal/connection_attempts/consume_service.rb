# frozen_string_literal: true

class ZaloPersonal::ConnectionAttempts::ConsumeService
  ACCOUNT_CONFLICT_ERROR = 'This Zalo account is already connected to another Chatwoot account'

  def initialize(attempt:, inbox_name: nil)
    @attempt = attempt
    @inbox_name = inbox_name
  end

  def perform
    return consumed_result if @attempt.consumed?
    return unavailable_result unless @attempt.authenticated?

    @existing_channel = existing_channel_for_profile
    return { success: false, error: ACCOUNT_CONFLICT_ERROR } if existing_channel_from_another_account?

    bridge_result = provision_bridge
    return bridge_result unless bridge_result[:success]

    @bridge_data = bridge_result[:data]
    @bridge_status = bridge_result.dig(:data, 'status')
    consume_locally
  rescue StandardError => e
    ChatwootExceptionTracker.new(e, account: @attempt.account).capture_exception
    Rails.logger.error "Unable to consume Zalo Personal connection attempt #{@attempt.public_id}: #{e.class}: #{e.message}"
    { success: false, error: e.message }
  end

  private

  def consume_locally
    @attempt.with_lock do
      return consumed_result if @attempt.consumed?
      return unavailable_result unless @attempt.authenticated?

      @attempt.create_channel? ? create_channel : reconnect_channel
    end
  end

  def provision_bridge
    channel = @attempt.target_inbox&.channel || @existing_channel || existing_channel_for_profile
    session_generation = @attempt.reconnect? ? channel.session_generation + 1 : 0
    response = ZaloPersonal::BridgeClient.new.consume_qr_flow(
      @attempt.bridge_integration_id,
      @attempt.bridge_session_id,
      account_id: @attempt.account_id,
      inbox_id: channel&.inbox&.id,
      session_generation: session_generation
    )

    return response if response[:success]

    { success: false, error: response[:error] || 'Unable to activate the Zalo session' }
  end

  def create_channel
    existing = @existing_channel || existing_channel_for_profile
    return reuse_existing_channel(existing) if existing

    channel = @attempt.account.zalo_personal_channels.create!(
      identifier: @attempt.bridge_integration_id,
      bridge_session_id: @attempt.bridge_session_id,
      zalo_user_id: zalo_user_id_from_profile,
      display_name: @attempt.profile['display_name'],
      avatar_url: @attempt.profile['avatar_url'],
      capabilities: @attempt.capabilities,
      connection_status: :connecting,
      signing_secret: @attempt.signing_secret
    )

    name = @inbox_name.presence || channel.display_name.presence || 'Zalo Personal'
    inbox = @attempt.account.inboxes.create!(name: name, channel: channel)
    inbox.inbox_members.create!(user: @attempt.requested_by)

    consume_attempt!(inbox)
    finish_activation(channel)

    { success: true, inbox: inbox, channel: channel }
  end

  def reuse_existing_channel(existing)
    channel = existing
    inbox = channel.inbox

    if inbox.nil?
      name = @inbox_name.presence || channel.display_name.presence || 'Zalo Personal'
      inbox = @attempt.account.inboxes.create!(name: name, channel: channel)
      inbox.inbox_members.create!(user: @attempt.requested_by)
    end

    channel.update!(
      identifier: @attempt.bridge_integration_id,
      bridge_session_id: @attempt.bridge_session_id,
      zalo_user_id: zalo_user_id_from_profile,
      display_name: @attempt.profile['display_name'] || channel.display_name,
      avatar_url: @attempt.profile['avatar_url'] || channel.avatar_url,
      capabilities: @attempt.capabilities.presence || channel.capabilities,
      connection_status: :connecting,
      session_generation: @bridge_data ? @bridge_data.fetch('session_generation', 0) : 0,
      signing_secret: @attempt.signing_secret,
      enabled: true
    )

    consume_attempt!(inbox)
    finish_activation(channel)

    { success: true, inbox: inbox, channel: channel }
  end

  def reconnect_channel
    inbox = @attempt.target_inbox
    channel = inbox.channel

    channel.update!(
      bridge_session_id: @attempt.bridge_session_id,
      zalo_user_id: zalo_user_id_from_profile,
      display_name: @attempt.profile['display_name'] || channel.display_name,
      avatar_url: @attempt.profile['avatar_url'] || channel.avatar_url,
      capabilities: @attempt.capabilities.presence || channel.capabilities,
      connection_status: :connecting,
      session_generation: channel.session_generation + 1,
      signing_secret: @attempt.signing_secret
    )

    consume_attempt!(inbox)
    finish_activation(channel)

    { success: true, inbox: inbox, channel: channel }
  end

  def consume_attempt!(inbox)
    @attempt.update!(
      status: :consumed,
      consumed_at: Time.current,
      target_inbox: inbox
    )
  end

  def finish_activation(channel)
    if @bridge_status == 'connected'
      channel.mark_connected!
    else
      ZaloPersonal::ActivateSessionJob.perform_later(channel.id)
    end
  end

  def consumed_result
    inbox = @attempt.target_inbox
    return { success: false, error: 'Consumed attempt is missing its inbox' } unless inbox

    { success: true, inbox: inbox, channel: inbox.channel }
  end

  def zalo_user_id_from_profile
    (@attempt.profile&.dig('user_id') || @attempt.profile&.dig(:user_id))&.to_s
  end

  def existing_channel_for_profile
    uid = zalo_user_id_from_profile
    return nil if uid.blank?

    Channel::ZaloPersonal.find_by(zalo_user_id: uid)
  end

  def existing_channel_from_another_account?
    existing = @existing_channel || existing_channel_for_profile
    existing && existing.account_id != @attempt.account_id
  end

  def unavailable_result
    { success: false, error: 'Attempt is not authenticated or already consumed' }
  end
end

