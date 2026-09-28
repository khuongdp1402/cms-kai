# frozen_string_literal: true

class ZaloPersonal::SendTypingJob < ApplicationJob
  queue_as :high

  def perform(conversation_id, typing_status)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation&.inbox&.zalo_personal?

    # Outbound typing indicator to Zalo thread
  end
end
