# frozen_string_literal: true

class ZaloPersonal::ReactionService
  def initialize(channel:)
    @channel = channel
  end

  def add_reaction(event_payload:)
    provider_msg_id = event_payload.dig('data', 'message_id')
    reaction_icon = event_payload.dig('data', 'reaction')
    sender_id = event_payload.dig('data', 'user_id')

    mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return unless mapping

    message = mapping.message
    reactions = message.content_attributes&.dig('reactions') || []
    reactions << { 'emoji' => reaction_icon, 'user_id' => sender_id }

    message.update!(
      content_attributes: (message.content_attributes || {}).merge('reactions' => reactions)
    )
  end

  def remove_reaction(event_payload:)
    provider_msg_id = event_payload.dig('data', 'message_id')
    sender_id = event_payload.dig('data', 'user_id')

    mapping = @channel.message_mappings.find_by(provider_message_id: provider_msg_id)
    return unless mapping

    message = mapping.message
    reactions = (message.content_attributes&.dig('reactions') || []).reject { |r| r['user_id'] == sender_id }

    message.update!(
      content_attributes: (message.content_attributes || {}).merge('reactions' => reactions)
    )
  end
end
