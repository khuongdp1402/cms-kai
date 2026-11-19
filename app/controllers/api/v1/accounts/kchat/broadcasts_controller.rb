# frozen_string_literal: true

class Api::V1::Accounts::Kchat::BroadcastsController < Api::V1::Accounts::Kchat::BaseController
  before_action :check_admin_authorization?, only: [:create]
  before_action :require_active_subscription!, only: [:create]

  rescue_from Kchat::BroadcastsService::ValidationError do |e|
    render_kchat_error(e.message, :unprocessable_entity)
  end

  def index
    render json: { broadcasts: service.list }
  end

  def preview
    result = service.preview(
      inbox_id: params.require(:inbox_id),
      labels: preview_labels,
      only_24h: params[:only_24h]
    )
    render json: result
  end

  def create
    broadcast = service.create_broadcast!(user: Current.user, params: broadcast_params)
    render json: { broadcast: broadcast }, status: :created
  end

  private

  def service
    @service ||= Kchat::BroadcastsService.new(Current.account)
  end

  def preview_labels
    raw = params[:labels]
    return raw.split(/[,;\n]/) if raw.is_a?(String)

    Array(raw)
  end

  def broadcast_params
    params.permit(:title, :message, :inbox_id, :campaign_tag, :scheduled_at, :only_24h, :labels, labels: [])
  end
end
