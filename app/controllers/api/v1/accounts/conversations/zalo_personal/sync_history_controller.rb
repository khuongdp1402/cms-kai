# frozen_string_literal: true

class Api::V1::Accounts::Conversations::ZaloPersonal::SyncHistoryController < Api::V1::Accounts::BaseController
  before_action :set_conversation
  before_action :validate_zalo_personal_channel

  def create
    count = (params[:count] || 50).to_i

    result = ZaloPersonal::SyncGroupHistoryService.new(channel: @channel).perform(
      conversation: @conversation,
      count: count
    )

    if result[:success]
      render json: {
        success: true,
        imported_count: result[:imported_count],
        skipped_count: result[:skipped_count],
        total_fetched: result[:total_fetched]
      }
    else
      render json: { success: false, error: result[:error] }, status: :unprocessable_entity
    end
  end

  private

  def set_conversation
    @conversation = Current.account.conversations.find(params[:conversation_id])
  end

  def validate_zalo_personal_channel
    @channel = @conversation.inbox&.channel
    unless @channel.is_a?(Channel::ZaloPersonal) && @channel.connected?
      render json: { error: 'Conversation does not belong to a connected Zalo Personal channel' }, status: :unprocessable_entity
    end
  end
end
