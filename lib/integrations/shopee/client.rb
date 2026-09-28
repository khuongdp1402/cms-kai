# frozen_string_literal: true

module Integrations
  module Shopee
    class Client
      BASE_URL = 'https://partner.shopeemobile.com/api/v2'

      attr_reader :partner_id, :partner_key, :shop_id

      def initialize(partner_id:, partner_key:, shop_id:)
        @partner_id = partner_id
        @partner_key = partner_key
        @shop_id = shop_id
      end

      def get_message_list(conversation_id)
        # Shopee Open Platform API endpoint for chat messages
        path = '/api/v2/sellerchat/get_message_list'
        timestamp = Time.now.to_i
        sign = generate_sign(path, timestamp)

        HTTParty.get(
          "#{BASE_URL}#{path}",
          query: {
            partner_id: partner_id,
            timestamp: timestamp,
            access_token: access_token,
            shop_id: shop_id,
            sign: sign,
            conversation_id: conversation_id
          }
        )
      end

      def send_message(to_id:, text:)
        path = '/api/v2/sellerchat/send_message'
        timestamp = Time.now.to_i
        sign = generate_sign(path, timestamp)

        HTTParty.post(
          "#{BASE_URL}#{path}",
          query: {
            partner_id: partner_id,
            timestamp: timestamp,
            shop_id: shop_id,
            sign: sign
          },
          headers: { 'Content-Type' => 'application/json' },
          body: {
            to_id: to_id,
            message_type: 'text',
            content: { text: text }
          }.to_json
        )
      end

      private

      def generate_sign(path, timestamp)
        base_string = "#{partner_id}#{path}#{timestamp}#{shop_id}"
        OpenSSL::HMAC.hexdigest('SHA256', partner_key, base_string)
      end

      def access_token
        # Shopee OAuth Access Token implementation
        ENV.fetch('SHOPEE_ACCESS_TOKEN', '')
      end
    end
  end
end
