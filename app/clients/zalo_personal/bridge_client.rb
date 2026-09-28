# frozen_string_literal: true

require 'httparty'

class ZaloPersonal::BridgeClient
  include HTTParty

  def initialize(bridge_url: nil, secret: nil)
    @base_uri = bridge_url || ENV['ZALO_PERSONAL_BRIDGE_URL'] || 'http://localhost:5001'
    @secret = secret || ENV['ZALO_BRIDGE_SERVICE_SECRET'] || 'dev_service_secret_32bytes_long_key!'
  end

  def create_qr_flow(integration_id)
    post_signed("/internal/v1/integrations/#{integration_id}/qr-flows", {})
  end

  def qr_flow_status(integration_id, flow_id)
    get_signed("/internal/v1/integrations/#{integration_id}/qr-flows/#{flow_id}")
  end

  def consume_qr_flow(integration_id, flow_id, account_id:, inbox_id:, session_generation:)
    post_signed(
      "/internal/v1/integrations/#{integration_id}/qr-flows/#{flow_id}/consume",
      {
        account_id: account_id,
        inbox_id: inbox_id,
        session_generation: session_generation
      }.compact
    )
  end

  def integration_status(integration_id)
    get_signed("/internal/v1/integrations/#{integration_id}/status")
  end

  def disconnect_integration(integration_id)
    post_signed("/internal/v1/integrations/#{integration_id}/disconnect", {})
  end

  def delete_integration(integration_id)
    delete_signed("/internal/v1/integrations/#{integration_id}")
  end

  def reconnect_integration(integration_id)
    post_signed("/internal/v1/integrations/#{integration_id}/reconnect", {})
  end

  def send_message(integration_id, payload)
    post_signed("/internal/v1/integrations/#{integration_id}/messages", payload)
  end

  def delivery_status(integration_id, delivery_id)
    get_signed("/internal/v1/integrations/#{integration_id}/messages/#{delivery_id}")
  end

  def list_stickers(integration_id)
    get_signed("/internal/v1/integrations/#{integration_id}/stickers")
  end

  def list_groups(integration_id)
    get_signed("/internal/v1/integrations/#{integration_id}/groups")
  end

  def get_group(integration_id, group_id)
    get_signed("/internal/v1/integrations/#{integration_id}/groups/#{group_id}")
  end

  def get_groups_batch(integration_id, group_ids)
    post_signed("/internal/v1/integrations/#{integration_id}/groups/batch", { group_ids: group_ids })
  end

  def fetch_group_history(integration_id, group_id, count: 50)
    post_signed("/internal/v1/integrations/#{integration_id}/groups/#{group_id}/history", { count: count })
  end

  def force_sync(integration_id)
    post_signed("/internal/v1/integrations/#{integration_id}/sync", {})
  end

  def fetch_all_contacts(integration_id)
    get_signed("/internal/v1/integrations/#{integration_id}/contacts")
  end

  private

  def get_signed(path)
    url = "#{@base_uri}#{path}"
    timestamp = Time.current.to_i.to_s
    nonce = SecureRandom.hex(8)
    headers = ZaloPersonal::RequestSigner.sign(
      secret: @secret,
      key_id: 'service',
      timestamp: timestamp,
      nonce: nonce,
      body: ''
    )

    response = HTTParty.get(url, headers: headers, timeout: 60)
    parse_response(response)
  end

  def post_signed(path, payload)
    url = "#{@base_uri}#{path}"
    body = payload.is_a?(String) ? payload : payload.to_json
    timestamp = Time.current.to_i.to_s
    nonce = SecureRandom.hex(8)
    headers = ZaloPersonal::RequestSigner.sign(
      secret: @secret,
      key_id: 'service',
      timestamp: timestamp,
      nonce: nonce,
      body: body
    ).merge('Content-Type' => 'application/json')

    response = HTTParty.post(url, headers: headers, body: body, timeout: 60)
    parse_response(response)
  end

  def delete_signed(path)
    url = "#{@base_uri}#{path}"
    timestamp = Time.current.to_i.to_s
    nonce = SecureRandom.hex(8)
    headers = ZaloPersonal::RequestSigner.sign(
      secret: @secret,
      key_id: 'service',
      timestamp: timestamp,
      nonce: nonce,
      body: ''
    )

    response = HTTParty.delete(url, headers: headers, timeout: 15)
    parse_response(response)
  end

  def parse_response(response)
    res_body = begin
      JSON.parse(response.body)
    rescue StandardError
      {}
    end

    if response.code.between?(200, 299)
      { success: true, status: response.code, data: res_body }
    else
      { success: false, status: response.code, error: res_body['error'] || "HTTP Error #{response.code}" }
    end
  rescue StandardError => e
    { success: false, status: 500, error: e.message }
  end
end
