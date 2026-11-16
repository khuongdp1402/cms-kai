# frozen_string_literal: true

class Api::V1::Accounts::BrandGrowthController < Api::V1::Accounts::BaseController
  before_action :check_admin_authorization?, only: [:save_profile, :approve_job]
  before_action :require_active_subscription!, only: [:chat_reply, :repurpose]

  rescue_from Kchat::Entitlements::Expired do
    render json: { error: 'subscription_expired' }, status: :forbidden
  end

  rescue_from Ai::CustomLlmService::NotConfiguredError do
    render json: { error: 'ai_not_configured' }, status: :service_unavailable
  end
  rescue_from BrandGrowth::EngineService::InvalidTransitionError do |e|
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def overview
    render json: service.overview
  end

  def ai_health
    render json: Ai::CustomLlmService.new.health_status
  end

  def chat_reply
    render json: service.chat_reply(message: params.require(:message), history: history_params)
  end

  def save_profile
    render json: { brand_profile: service.save_profile(profile_params) }
  end

  def repurpose
    render json: service.repurpose(topic: params.require(:topic))
  end

  def approve_job
    render json: service.transition_job(job_id: params.require(:job_id), action: params.require(:job_action))
  end

  private

  def require_active_subscription!
    Kchat::Entitlements.require_active!(Current.account)
  end

  def service
    @service ||= BrandGrowth::EngineService.new(Current.account)
  end

  def history_params
    params.permit(history: [:role, :content]).fetch(:history, []).map(&:to_h)
  end

  def profile_params
    permitted = params.permit(:brand_name, :positioning, :usp, :persona, :tone, :hard_bans, hard_bans: []).to_h
    permitted['hard_bans'] = permitted['hard_bans'].split(/[,;\n]/).map(&:strip).reject(&:empty?) if permitted['hard_bans'].is_a?(String)
    permitted
  end
end
