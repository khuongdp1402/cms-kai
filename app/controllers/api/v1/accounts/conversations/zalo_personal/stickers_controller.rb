# frozen_string_literal: true

class Api::V1::Accounts::Conversations::ZaloPersonal::StickersController < Api::V1::Accounts::BaseController
  before_action :set_conversation

  def create
    sticker_id = params[:sticker_id]
    pack_id = params[:pack_id]

    message = @conversation.messages.create!(
      account_id: Current.account.id,
      inbox_id: @conversation.inbox_id,
      message_type: :outgoing,
      sender: Current.user,
      content: nil,
      content_type: :sticker,
      content_attributes: {
        sticker: {
          id: sticker_id,
          pack_id: pack_id
        }
      }
    )

    render json: message
  end

  private

  def set_conversation
    @conversation = Current.account.conversations.find(params[:conversation_id])
  end
end
