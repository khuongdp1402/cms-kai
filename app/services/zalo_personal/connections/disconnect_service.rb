# frozen_string_literal: true

class ZaloPersonal::Connections::DisconnectService
  def initialize(channel:)
    @channel = channel
  end

  def perform
    @channel.disconnect!
    ZaloPersonal::DisconnectSessionJob.perform_later(@channel.identifier)
    { success: true }
  rescue StandardError => e
    { success: false, error: e.message }
  end
end
