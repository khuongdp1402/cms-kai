# frozen_string_literal: true

module Integrations
  module Tiktok
    class Client
      BASE_URL = 'https://open-api.tiktokglobalshop.com'

      attr_reader :app_key, :app_secret, :shop_cipher

      def initialize(app_key:, app_secret:, shop_cipher:)
        @app_key = app_key
        @app_secret = app_secret
        @shop_cipher = shop_cipher
      end

      def send_message(conversation_id:, text:)
        path = '/api/v2/customer_service/conversations/messages/send'
        timestamp = Time.now.to_i

        HTTParty.post(
          "#{BASE_URL}#{path}",
          query: {
            app_key: app_key,
            timestamp: timestamp,
            shop_cipher: shop_cipher
          },
          headers: { 'Content-Type' => 'application/json' },
          body: {
            conversation_id: conversation_id,
            type: 'TEXT',
            content: { text: text }
          }.to_json
        )
      end
    end
  end
end
