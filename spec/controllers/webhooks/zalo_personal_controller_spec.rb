# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Webhooks::ZaloPersonalController', type: :request do
  let(:service_secret) { 'bridge-service-secret-for-tests' }
  let(:channel) { create(:channel_zalo_personal, signing_secret: 'different-channel-secret') }
  let(:payload) do
    {
      version: 1,
      event_id: "evt_#{SecureRandom.hex(8)}",
      integration_id: channel.identifier,
      type: 'message.created',
      sequence: 1,
      occurred_at: Time.current.iso8601,
      session_generation: channel.session_generation,
      data: {
        thread: { id: 'thread-1', type: 'direct' },
        sender: { id: 'sender-1', name: 'Sender' },
        message: { id: 'message-1', direction: 'incoming', text: 'Hello', attachments: [] }
      }
    }
  end

  before do
    allow(Rails.env).to receive(:production?).and_return(true)
    allow(ZaloPersonal::ReplayGuard).to receive(:valid_nonce?).and_return(true)
    allow(ZaloPersonal::ProcessWebhookEventJob).to receive(:perform_later)
  end

  it 'accepts a production callback signed with the bridge service secret' do
    raw_body = payload.to_json

    with_modified_env('ZALO_BRIDGE_SERVICE_SECRET' => service_secret) do
      post webhook_path, params: raw_body, headers: signed_headers(service_secret, raw_body)
    end

    expect(response).to have_http_status(:accepted)
    event = channel.webhook_events.find_by!(event_id: payload[:event_id])
    expect(event).to have_attributes(status: 'pending')
  end

  it 'rejects a callback signed only with the channel secret' do
    raw_body = payload.to_json

    with_modified_env('ZALO_BRIDGE_SERVICE_SECRET' => service_secret) do
      post webhook_path, params: raw_body, headers: signed_headers(channel.signing_secret, raw_body)
    end

    expect(response).to have_http_status(:unauthorized)
    expect(channel.webhook_events.where(event_id: payload[:event_id])).not_to exist
  end

  it 'fails closed when the bridge service secret is missing' do
    raw_body = payload.to_json

    with_modified_env('ZALO_BRIDGE_SERVICE_SECRET' => nil) do
      post webhook_path, params: raw_body, headers: signed_headers(channel.signing_secret, raw_body)
    end

    expect(response).to have_http_status(:unauthorized)
    expect(channel.webhook_events.where(event_id: payload[:event_id])).not_to exist
  end

  it 'rejects an unsigned callback outside production' do
    raw_body = payload.to_json
    allow(Rails.env).to receive(:production?).and_return(false)

    with_modified_env('ZALO_BRIDGE_SERVICE_SECRET' => service_secret) do
      post webhook_path, params: raw_body, headers: { 'CONTENT_TYPE' => 'application/json' }
    end

    expect(response).to have_http_status(:unauthorized)
    expect(channel.webhook_events.where(event_id: payload[:event_id])).not_to exist
  end

  private

  def webhook_path
    "/webhooks/zalo_personal/#{channel.identifier}"
  end

  def signed_headers(secret, body)
    timestamp = Time.current.to_i.to_s
    nonce = "nonce_#{SecureRandom.hex(8)}"

    ZaloPersonal::RequestSigner.sign(
      secret: secret,
      key_id: 'service',
      timestamp: timestamp,
      nonce: nonce,
      body: body
    ).merge('CONTENT_TYPE' => 'application/json')
  end
end
