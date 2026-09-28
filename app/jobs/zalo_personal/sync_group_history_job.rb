# frozen_string_literal: true

class ZaloPersonal::SyncGroupHistoryJob < ApplicationJob
  queue_as :default

  def perform(conversation_id, count: 50)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation

    channel = conversation.inbox&.channel
    return unless channel.is_a?(Channel::ZaloPersonal) && channel.connected?

    ZaloPersonal::SyncGroupHistoryService.new(channel: channel).perform(
      conversation: conversation,
      count: count
    )
  end
end
