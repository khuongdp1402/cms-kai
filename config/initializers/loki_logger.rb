# frozen_string_literal: true

# Direct Loki HTTP Logger Initializer for Chatwoot
# Sends log streams directly to Grafana Loki API Endpoint asynchronously
if ENV['LOKI_URL'].present?
  require 'net/http'
  require 'uri'
  require 'json'

  module LokiLogger
    class << self
      def push_log(message, level: 'info')
        return if @disabled

        Thread.new do
          send_to_loki(message, level)
        rescue StandardError => e
          # Suppress error to prevent affecting main thread
          begin
            Rails.logger.warn("LokiLogger push error: #{e.message}")
          rescue StandardError
            nil
          end
        end
      end

      private

      def send_to_loki(message, level)
        base_url = ENV['LOKI_URL'].strip
        push_endpoint = base_url.end_with?('/loki/api/v1/push') ? base_url : "#{base_url.chomp('/')}/loki/api/v1/push"

        uri = URI.parse(push_endpoint)
        timestamp_ns = (Time.now.to_f * 1_000_000_000).to_i.to_s

        payload = {
          streams: [
            {
              stream: {
                app: 'dsf-chatwoot',
                environment: ENV.fetch('ENVIRONMENT_NAME', Rails.env),
                level: level.to_s,
                host: Socket.gethostname
              },
              values: [
                [timestamp_ns, message.to_s]
              ]
            }
          ]
        }

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == 'https')
        http.open_timeout = 2
        http.read_timeout = 2

        request = Net::HTTP::Post.new(uri.path, { 'Content-Type' => 'application/json' })
        request.body = payload.to_json

        response = http.request(request)
        return if response.is_a?(Net::HTTPSuccess)

        begin
          Rails.logger.warn("Loki HTTP push failed with status #{response.code}")
        rescue StandardError
          nil
        end
      end
    end
  end

  # Broadcast Rails logs to Loki Logger
  ActiveSupport::Notifications.subscribe('process_action.action_controller') do |*args|
    event = ActiveSupport::Notifications::Event.new(*args)
    payload = event.payload

    log_data = {
      timestamp: Time.now.iso8601,
      environment: ENV.fetch('ENVIRONMENT_NAME', Rails.env),
      controller: payload[:controller],
      action: payload[:action],
      status: payload[:status],
      duration_ms: event.duration.round(2),
      db_runtime_ms: payload[:db_runtime]&.round(2),
      view_runtime_ms: payload[:view_runtime]&.round(2),
      params: payload[:params]&.except('controller', 'action', 'authenticity_token'),
      method: payload[:method],
      path: payload[:path]
    }

    LokiLogger.push_log(log_data.to_json, level: payload[:status].to_i >= 400 ? 'error' : 'info')
  end
end
