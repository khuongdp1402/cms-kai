# frozen_string_literal: true

class Api::V1::Accounts::Conversations::ZaloPersonal::ParticipantsController < Api::V1::Accounts::BaseController
  before_action :set_conversation

  def index
    channel = @conversation.inbox.channel
    thread = channel.threads.find_by(contact_inbox_id: @conversation.contact_inbox_id)

    participants = if thread
                     thread.participants.includes(:contact).map do |p|
                       {
                         id: p.provider_user_id,
                         name: p.display_name || p.contact.name,
                         avatar_url: p.avatar_url || p.contact.avatar_url,
                         role: p.role
                       }
                     end
                   else
                     []
                   end

    render json: { participants: participants }
  end

  private

  def set_conversation
    @conversation = Current.account.conversations.find(params[:conversation_id])
  end
end
