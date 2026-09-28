# frozen_string_literal: true

class ZaloPersonal::SendOnZaloPersonalService < Base::SendOnChannelService
  private

  def channel_class
    Channel::ZaloPersonal
  end

  def perform_reply
    return unless channel.connected?

    delivery_id = SecureRandom.uuid
    payload = ZaloPersonal::OutboundMessagePayloadBuilder.new(
      message: message,
      delivery_id: delivery_id
    ).build

    # Record outbound mapping
    thread = channel.threads.find_by(contact_inbox_id: conversation.contact_inbox_id)
    if thread
      channel.message_mappings.create!(
        thread: thread,
        message: message,
        delivery_id: delivery_id,
        part_index: 0,
        part_kind: message.attachments.present? ? :attachment : :text,
        direction: :outgoing,
        status: :pending
      )
    end

    client = ZaloPersonal::BridgeClient.new
    res = client.send_message(channel.identifier, payload)

    if res[:success]
      message.update!(source_id: delivery_id)
    else
      message.update!(status: 'failed')
      Rails.logger.error "Failed to send Zalo Personal message #{message.id}: #{res[:error]}"
    end
  rescue StandardError => e
    message.update!(status: 'failed')
    Rails.logger.error "Exception sending Zalo Personal message #{message.id}: #{e.message}"
  end
end
