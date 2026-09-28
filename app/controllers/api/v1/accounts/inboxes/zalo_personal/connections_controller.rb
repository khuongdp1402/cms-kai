# frozen_string_literal: true

class Api::V1::Accounts::Inboxes::ZaloPersonal::ConnectionsController < Api::V1::Accounts::BaseController
  before_action :set_inbox
  before_action :set_channel
  before_action :check_authorization

  def show
    render json: {
      identifier: @channel.identifier,
      connection_status: @channel.connection_status,
      enabled: @channel.enabled,
      zalo_user_id: @channel.zalo_user_id,
      display_name: @channel.display_name,
      avatar_url: @channel.avatar_url,
      last_connected_at: @channel.last_connected_at,
      capabilities: @channel.capabilities
    }
  end

  def reconnect
    res = ZaloPersonal::Connections::ReconnectService.new(
      inbox: @inbox,
      user: Current.user
    ).perform

    if res[:success]
      render json: {
        public_id: res[:attempt].public_id,
        status: res[:attempt].status,
        qr_data_url: res[:qr_data_url],
        expires_at: res[:expires_at]
      }
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  def destroy
    res = ZaloPersonal::Connections::DisconnectService.new(channel: @channel).perform

    if res[:success]
      render json: { success: true }
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  private

  def set_inbox
    @inbox = Current.account.inboxes.find(params[:inbox_id])
  end

  def set_channel
    @channel = @inbox.channel
    render json: { error: 'Not a Zalo Personal inbox' }, status: :bad_request unless @inbox.zalo_personal?
  end

  def check_authorization
    authorize(:inbox, :update?)
  end
end
