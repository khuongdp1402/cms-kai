# frozen_string_literal: true

class ZaloPersonal::TypingService
  def initialize(channel:)
    @channel = channel
  end

  def toggle(event_payload:, typing_status:)
    thread_id = event_payload.dig('data', 'thread', 'id')
    user_id = event_payload.dig('data', 'sender', 'id')
    user_name = event_payload.dig('data', 'sender', 'name')

    thread = @channel.threads.find_by(provider_thread_id: thread_id)
    return unless thread

    conversation = thread.contact_inbox.conversations.first
    return unless conversation

    # Broadcast typing status via ActionCable
    ActionCable.server.broadcast(
      conversation.account.pubsub_token,
      {
        event: 'conversation.typing_status',
        data: {
          conversation: conversation.id,
          user: { id: user_id, name: user_name },
          is_typing: typing_status == :started
        }
      }
    )
  end
end
