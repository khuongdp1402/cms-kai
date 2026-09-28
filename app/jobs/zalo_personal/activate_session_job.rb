# frozen_string_literal: true

class ZaloPersonal::ActivateSessionJob < ApplicationJob
  queue_as :default

  def perform(channel_id)
    channel = Channel::ZaloPersonal.find_by(id: channel_id)
    return unless channel

    client = ZaloPersonal::BridgeClient.new
    res = client.integration_status(channel.identifier)

    if res[:success]
      status_data = res[:data]
      if status_data['status'] == 'connected'
        channel.mark_connected!
      elsif status_data['status'] == 'reauth_required'
        channel.prompt_reauthorization!
      end
    end
  end
end
