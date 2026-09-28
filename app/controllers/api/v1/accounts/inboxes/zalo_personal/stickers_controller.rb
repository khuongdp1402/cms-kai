# frozen_string_literal: true

class Api::V1::Accounts::Inboxes::ZaloPersonal::StickersController < Api::V1::Accounts::BaseController
  before_action :set_inbox
  before_action :set_channel

  def index
    client = ZaloPersonal::BridgeClient.new
    res = client.list_stickers(@channel.identifier)
    render json: res[:data] || { stickers: [] }
  end

  private

  def set_inbox
    @inbox = Current.account.inboxes.find(params[:inbox_id])
  end

  def set_channel
    @channel = @inbox.channel
  end
end
