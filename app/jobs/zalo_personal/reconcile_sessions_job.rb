# frozen_string_literal: true

class ZaloPersonal::ReconcileSessionsJob < ApplicationJob
  queue_as :scheduled_jobs

  def perform
    client = ZaloPersonal::BridgeClient.new

    Channel::ZaloPersonal.where(enabled: true).find_each do |channel|
      res = client.integration_status(channel.identifier)
      next unless res[:success]

      status_data = res[:data]
      bridge_status = status_data['status']

      case bridge_status
      when 'connected'
        channel.mark_connected! unless channel.connected?
      when 'reauth_required'
        channel.prompt_reauthorization! unless channel.reauthorization_required?
      when 'reconnecting'
        channel.mark_reconnecting! unless channel.reconnecting?
      when 'degraded'
        channel.mark_degraded! unless channel.degraded?
      end
    end
  end
end
