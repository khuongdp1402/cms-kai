# frozen_string_literal: true

class ZaloPersonal::MessageStatusService
  def initialize(channel:)
    @channel = channel
  end

  def update_status(event_payload:, status:)
    provider_msg_id = event_payload.dig('data', 'message_id')
    mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return unless mapping

    mapping.update!(status: status)
    message = mapping.message
    message.update!(status: status.to_s) if message.respond_to?(:status)
  end
end
