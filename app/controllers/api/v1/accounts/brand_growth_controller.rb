# frozen_string_literal: true

class Api::V1::Accounts::BrandGrowthController < Api::V1::Accounts::BaseController
  # Every chat_reply/repurpose call is a paid AI request, so inputs are bounded.
  MAX_MESSAGE_CHARS = 2_000
  MAX_HISTORY_ITEMS = 6
  MAX_HISTORY_CONTENT_CHARS = 2_000
  MAX_TOPIC_CHARS = 300

  before_action :check_admin_authorization?, only: [:save_profile, :approve_job]
  before_action :require_active_subscription!, only: [:chat_reply, :repurpose]
  before_action :throttle_ai_calls!, only: [:chat_reply, :repurpose]

  rescue_from Kchat::Entitlements::Expired do
    render json: { error: 'subscription_expired' }, status: :forbidden
  end

  rescue_from Ai::CustomLlmService::NotConfiguredError do
    render json: { error: 'ai_not_configured' }, status: :service_unavailable
  end
  rescue_from Ai::CustomLlmService::PromptTooLargeError do
    render json: { error: 'prompt_too_large' }, status: :unprocessable_entity
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
    message = params.require(:message).to_s
    return render json: { error: 'message_too_long' }, status: :unprocessable_entity if message.length > MAX_MESSAGE_CHARS

    render json: service.chat_reply(message: message, history: history_params)
  end

  def save_profile
    render json: { brand_profile: service.save_profile(profile_params) }
  end

  def repurpose
    topic = params.require(:topic).to_s
    return render json: { error: 'topic_too_long' }, status: :unprocessable_entity if topic.length > MAX_TOPIC_CHARS

    render json: service.repurpose(topic: topic)
  end

  def approve_job
    render json: service.transition_job(job_id: params.require(:job_id), action: params.require(:job_action))
  end

  private

  # Authoritative cap on paid AI calls, keyed on the authorized account id (not on the request path, which has many spellings).
  # There is deliberately no pre-auth rack-attack throttle on this path: it would let anyone burn a victim's quota.
  def throttle_ai_calls!
    limit = ENV.fetch('BRAND_GROWTH_AI_LIMIT', '30').to_i
    return if Kchat::AiThrottle.count("brand_growth_ai/controller:#{Current.account.id}", 1.minute) <= limit

    render json: { error: 'rate_limited' }, status: :too_many_requests
  end

  def require_active_subscription!
    Kchat::Entitlements.require_active!(Current.account)
  end

  def service
    @service ||= BrandGrowth::EngineService.new(Current.account)
  end

  def history_params
    raw = params[:history]
    return [] unless raw.is_a?(Array)

    items = params.permit(history: [:role, :content]).fetch(:history, []).last(MAX_HISTORY_ITEMS).map(&:to_h)
    items.each { |item| item['content'] = item['content'].to_s.first(MAX_HISTORY_CONTENT_CHARS) if item.key?('content') }
  end

  def profile_params
    permitted = params.permit(:brand_name, :positioning, :usp, :persona, :tone, :hard_bans, hard_bans: []).to_h
    permitted['hard_bans'] = permitted['hard_bans'].split(/[,;\n]/).map(&:strip).reject(&:empty?) if permitted['hard_bans'].is_a?(String)
    permitted
  end
end
