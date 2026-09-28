# frozen_string_literal: true

class ZaloPersonal::DisconnectSessionJob < ApplicationJob
  queue_as :default

  def perform(channel_identifier)
    client = ZaloPersonal::BridgeClient.new
    client.disconnect_integration(channel_identifier)
  end
end
