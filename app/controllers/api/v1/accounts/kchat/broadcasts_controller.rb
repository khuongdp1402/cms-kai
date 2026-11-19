# frozen_string_literal: true

class Api::V1::Accounts::Kchat::BroadcastsController < Api::V1::Accounts::Kchat::BaseController
  MAX_CHECK_CHARS = Kchat::BroadcastsService::MAX_MESSAGE_CHARS

  before_action :check_admin_authorization?, only: [:create, :update, :destroy]
  before_action :require_active_subscription!, only: [:create, :update]

  rescue_from Kchat::BroadcastsService::ValidationError do |e|
    render_kchat_error(e.message, :unprocessable_entity)
  end

  def index
    render json: { broadcasts: service.list_with_delivery_stats }
  end

  def show
    render json: service.results(params[:id])
  end

  def preview
    result = service.preview(
      inbox_id: params.require(:inbox_id),
      labels: labels_param,
      only_24h: params[:only_24h],
      segment_id: params[:segment_id]
    )
    render json: result
  end

  def audience
    render json: service.audience_summary(labels: labels_param, segment_id: params[:segment_id])
  end

  def check_content
    message = params.require(:message).to_s
    return render_kchat_error('message_too_long', :unprocessable_entity) if message.length > MAX_CHECK_CHARS

    render json: service.check_content(message)
  end

  def create
    broadcast = service.create_broadcast!(user: Current.user, params: broadcast_params)
    render json: { broadcast: broadcast }, status: :created
  end

  def update
    broadcast = service.update_draft!(params[:id], user: Current.user, params: broadcast_params)
    render json: { broadcast: broadcast }
  end

  def destroy
    service.destroy_draft!(params[:id])
    head :no_content
  end

  private

  def service
    @service ||= Kchat::BroadcastsService.new(Current.account)
  end

  def labels_param
    raw = params[:labels]
    return raw.split(/[,;\n]/) if raw.is_a?(String)

    Array(raw)
  end

  def broadcast_params
    params.permit(:title, :message, :inbox_id, :campaign_tag, :scheduled_at, :only_24h, :goal, :segment_id, :draft, :labels, labels: [])
  end
end
