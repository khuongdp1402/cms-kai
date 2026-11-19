# frozen_string_literal: true

# In-app AI assistant for shop members: usage help, content writing, weekly insights. Every call is a paid AI request,
# so inputs are bounded and calls are throttled per account. Prompts only ever contain Current.account data.
class Api::V1::Accounts::Kchat::AssistantController < Api::V1::Accounts::Kchat::BaseController
  MODES = %w[help write insights].freeze
  MAX_MESSAGE_CHARS = 2_000
  MAX_HISTORY_ITEMS = 6
  MAX_HISTORY_CONTENT_CHARS = 2_000
  MAX_PROFILE_FIELD_CHARS = 500
  GUIDE = Rails.root.join('config/kalo/assistant_guide.vi.md').read.strip.freeze
  BASE_PROMPT = 'Bạn là trợ lý AI trong ứng dụng Kalo cho chủ shop online Việt Nam. Trả lời tiếng Việt, ngắn gọn, thực tế.'

  before_action :require_active_subscription!
  before_action :throttle_ai_calls!
  before_action :validate_params!

  rescue_from Ai::CustomLlmService::NotConfiguredError do
    render_kchat_error('ai_not_configured', :service_unavailable)
  end
  rescue_from Ai::CustomLlmService::ProviderError do |e|
    Rails.logger.error("[kchat_assistant] #{e.message}")
    render_kchat_error('ai_unavailable', :bad_gateway)
  end
  rescue_from Ai::CustomLlmService::PromptTooLargeError do
    render_kchat_error('prompt_too_large', :unprocessable_entity)
  end

  def create
    llm = Ai::CustomLlmService.new
    reply = llm.complete([{ role: 'system', content: system_prompt }] + history_messages + [{ role: 'user', content: message }])
    reply = llm.enforce_brand_guardrails(reply, brand_profile['hard_bans'])[:sanitized_text] if mode == 'write'
    render json: { reply: reply }
  end

  private

  def message
    @message ||= params[:message].to_s.strip
  end

  def mode
    @mode ||= params[:mode].presence || 'help'
  end

  def validate_params!
    return render_kchat_error('invalid_mode', :unprocessable_entity) unless MODES.include?(mode)
    return render_kchat_error('message_required', :unprocessable_entity) if message.empty?

    render_kchat_error('message_too_long', :unprocessable_entity) if message.length > MAX_MESSAGE_CHARS
  end

  # Authoritative cap keyed on the authorized account id; shared by all modes.
  def throttle_ai_calls!
    limit = ENV.fetch('KCHAT_ASSISTANT_LIMIT', '30').to_i
    return if ::Kchat::AiThrottle.count("kchat_assistant/controller:#{Current.account.id}", 1.minute) <= limit

    render_kchat_error('rate_limited', :too_many_requests)
  end

  def system_prompt
    [BASE_PROMPT, send("#{mode}_prompt")].join("\n\n")
  end

  def help_prompt
    "Trả lời câu hỏi cách dùng Kalo CHỈ dựa vào tài liệu sau.\n\n#{GUIDE}"
  end

  def insights_prompt
    summary = ::Kchat::Reports.new(Current.account, '7d').summary.to_json
    'Tóm tắt và nhận xét số liệu 7 ngày gần nhất của shop dựa CHỈ vào JSON sau (đơn vị tiền: đồng). Không bịa số liệu; ' \
      "thiếu dữ liệu thì nói là chưa có. Gợi ý 1-3 việc nên làm tiếp.\nSố liệu: #{summary}"
  end

  def write_prompt
    lines = ['Viết nội dung bán hàng (bài đăng, tin nhắn chiến dịch, mô tả sản phẩm, gợi ý SEO) theo hồ sơ thương hiệu. ' \
             'Không bịa thông tin sản phẩm, giá hay khuyến mãi; thiếu thì hỏi lại.']
    lines << "- Tên thương hiệu: #{brand_profile['brand_name']}" if brand_profile['brand_name'].present?
    Ai::CustomLlmService::BRAND_PROMPT_FIELDS.each do |key, label|
      lines << "- #{label}: #{brand_profile[key]}" if brand_profile[key].present?
    end
    lines << "- Tuyệt đối không dùng các cụm từ: #{banned_phrases.join(', ')}."
    lines.join("\n")
  end

  def brand_profile
    @brand_profile ||= begin
      profile = Current.account.custom_attributes.to_h.dig('brand_growth', 'profile')
      profile = {} unless profile.is_a?(Hash)
      profile.transform_values { |v| v.is_a?(String) ? v.first(MAX_PROFILE_FIELD_CHARS) : v }
    end
  end

  def banned_phrases
    bans = brand_profile['hard_bans']
    bans = bans.split(/[,;\n]/) if bans.is_a?(String)
    bans = bans.first(50).map { |b| b.to_s.first(MAX_PROFILE_FIELD_CHARS) } if bans.is_a?(Array)
    (Ai::CustomLlmService::DEFAULT_HARD_BANS + Array(bans)).map { |b| b.to_s.strip }.compact_blank.uniq
  end

  def history_messages
    raw = params[:history]
    return [] unless raw.is_a?(Array)

    params.permit(history: [:role, :content]).fetch(:history, []).last(MAX_HISTORY_ITEMS).filter_map do |turn|
      content = turn[:content].to_s.first(MAX_HISTORY_CONTENT_CHARS)
      { role: turn[:role] == 'assistant' ? 'assistant' : 'user', content: content } if content.present?
    end
  end
end
