# frozen_string_literal: true

class Api::V1::Accounts::Inboxes::ZaloPersonal::SyncController < Api::V1::Accounts::BaseController
  before_action :set_inbox
  before_action :validate_zalo_personal_channel

  # POST /inboxes/:inbox_id/zalo_personal/sync
  # Triggers a full sync: fetch all contacts from Zalo, create conversations,
  # then request recent messages.
  def create
    sync_type = params[:type] || 'full'

    result = case sync_type
             when 'messages'
               @client.force_sync(@channel.identifier)
             when 'full'
               ZaloPersonal::SyncAllContactsService.new(channel: @channel).perform
             else
               @client.force_sync(@channel.identifier)
             end

    if result[:success]
      render json: result.merge(success: true)
    else
      render json: { success: false, error: result[:error] || 'Sync request failed' }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error "Zalo sync controller error: #{e.class} — #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
    render json: { success: false, error: "#{e.class}: #{e.message}" }, status: :internal_server_error
  end

  private

  def set_inbox
    @inbox = Current.account.inboxes.find(params[:inbox_id])
  end

  def validate_zalo_personal_channel
    @channel = @inbox.channel
    unless @channel.is_a?(Channel::ZaloPersonal) && @channel.connected?
      render json: { error: 'Inbox is not a connected Zalo Personal channel' }, status: :unprocessable_entity
      return
    end
    @client = ZaloPersonal::BridgeClient.new
  end
end
