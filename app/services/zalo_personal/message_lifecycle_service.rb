# frozen_string_literal: true

class ZaloPersonal::MessageLifecycleService
  def initialize(channel:)
    @channel = channel
  end

  def recall(event_payload:)
    provider_msg_id = event_payload.dig('data', 'message_id')
    mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return unless mapping

    message = mapping.message
    message.update!(
      content: I18n.t('conversations.messages.deleted'),
      content_attributes: (message.content_attributes || {}).merge('deleted' => true, 'recalled_at' => event_payload['occurred_at'])
    )
  end

  def edit(event_payload:)
    provider_msg_id = event_payload.dig('data', 'message_id')
    new_text = event_payload.dig('data', 'text')
    mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return unless mapping

    message = mapping.message
    message.update!(
      content: new_text,
      content_attributes: (message.content_attributes || {}).merge('edited' => true, 'edited_at' => event_payload['occurred_at'])
    )
  end
end
