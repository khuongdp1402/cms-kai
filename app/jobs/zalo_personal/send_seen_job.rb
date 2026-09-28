# frozen_string_literal: true

class ZaloPersonal::SendSeenJob < ApplicationJob
  queue_as :high

  def perform(conversation_id)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation&.inbox&.zalo_personal?

    # Outbound read receipts to Zalo thread
  end
end
