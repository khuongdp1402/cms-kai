# frozen_string_literal: true

class Webhooks::ZaloPersonalController < ActionController::API
  before_action :set_channel
  before_action :verify_signature
  before_action :verify_nonce

  def process_payload
    raw_body = request.raw_post
    payload_sha = Digest::SHA256.hexdigest(raw_body)
    payload_json = JSON.parse(raw_body)

    event = @channel.webhook_events.create!(
      event_id: payload_json['event_id'],
      event_type: payload_json['type'],
      thread_id: payload_json.dig('data', 'thread', 'id'),
      sequence: payload_json['sequence'],
      provider_message_id: payload_json.dig('data', 'message', 'id'),
      payload: raw_body,
      payload_sha256: payload_sha,
      status: :pending,
      occurred_at: payload_json['occurred_at'] || Time.current
    )

    ZaloPersonal::ProcessWebhookEventJob.perform_later(event.id)

    render json: { success: true, event_id: event.event_id }, status: :accepted
  rescue StandardError => e
    render json: { success: false, error: e.message }, status: :unprocessable_entity
  end

  private

  def set_channel
    identifier = params[:identifier].to_s
    @channel = Channel::ZaloPersonal.find_by(identifier: identifier)
    # Also support channel by public_id on connection attempt if channel not yet created
    return if @channel.present?

    render json: { error: 'Channel not found' }, status: :not_found
  end

  def verify_signature
    # The bridge signs all internal callbacks with the shared service secret.
    # Channel signing secrets are not provisioned to the bridge and therefore
    # cannot be used to authenticate these callbacks.
    secret = ENV['ZALO_BRIDGE_SERVICE_SECRET']
    signature = request.headers['X-Zalo-Personal-Signature']
    timestamp = request.headers['X-Zalo-Personal-Timestamp']
    nonce = request.headers['X-Zalo-Personal-Nonce']
    raw_body = request.raw_post

    is_valid = secret.present? && ZaloPersonal::RequestSigner.verify(
      secret: secret,
      signature: signature,
      timestamp_str: timestamp,
      nonce: nonce,
      body: raw_body
    )

    return if is_valid

    render json: { error: 'Invalid HMAC signature' }, status: :unauthorized
  end

  def verify_nonce
    nonce = request.headers['X-Zalo-Personal-Nonce']
    return if !Rails.env.production?

    unless ZaloPersonal::ReplayGuard.valid_nonce?(nonce)
      render json: { error: 'Replay detected or invalid nonce' }, status: :unauthorized
    end
  end
end
