# frozen_string_literal: true

# OpenAI-compatible chat client (AgentGW by default) with brand guardrails.
# Gemini REST is used only when AI_PROVIDER=gemini_api.
class Ai::CustomLlmService
  class NotConfiguredError < StandardError; end
  class PromptTooLargeError < StandardError; end
  # The provider was reached but refused (bad key, 5xx, garbage body) or could not be reached at all.
  class ProviderError < StandardError
    # HTTP status of the refused call, nil when the provider could not be reached or answered garbage.
    attr_reader :status

    def initialize(message = nil, status: nil)
      @status = status
      super(message)
    end

    # 400/413/422/429 are about this request (or the shop's quota), not a broken provider.
    def provider_down?
      status.nil? || [401, 403].include?(status) || status >= 500
    end
  end

  NETWORK_ERRORS = [Timeout::Error, SocketError, SystemCallError, OpenSSL::SSL::SSLError, EOFError, HTTParty::Error].freeze

  # Defense in depth behind the controller limits: a paid call never carries more than this many characters in total.
  MAX_PROMPT_CHARS = 20_000

  DEFAULT_BASE_URL = 'https://agentgw.cloud/v1'
  DEFAULT_CHAT_MODEL = 'agentgw-gpt-5.5'
  DEFAULT_REASONING_MODEL = 'agentgw-opus-4-8'
  GEMINI_API_TEMPLATE = 'https://generativelanguage.googleapis.com/v1beta/models/%<model>s:generateContent'
  BAN_REPLACEMENT = '[…]'
  DEFAULT_HARD_BANS = ['trị khỏi 100%', 'cam kết vĩnh viễn', 'chữa dứt điểm hoàn toàn', 'tốt nhất thế giới'].freeze

  attr_reader :api_key, :base_url, :model, :provider

  def initialize(api_key: nil, endpoint: nil, model: nil, provider: nil)
    @provider = (provider || ENV.fetch('AI_PROVIDER', 'agentgw')).to_s.downcase
    @base_url = (endpoint || ENV.fetch('AGENTGW_BASE_URL', DEFAULT_BASE_URL)).sub(%r{/+\z}, '')
    @api_key = api_key || ENV.fetch('AGENTGW_API_KEY', ENV.fetch('CUSTOM_AI_API_KEY', ''))
    @model = model || ENV.fetch('AGENTGW_MODEL', DEFAULT_CHAT_MODEL)
  end

  def configured?
    gemini? ? ENV.fetch('GEMINI_API_KEY', '').present? : @api_key.present?
  end

  # available is false while a provider call failed within Kchat::AiHealth::FAILURE_TTL (bad key, provider down).
  def health_status
    last_failure_at = configured? ? Kchat::AiHealth.last_failure_at : nil
    {
      provider: @provider, configured: configured?, available: configured? && last_failure_at.nil?,
      last_failure_at: last_failure_at, chat_model: gemini? ? gemini_model : @model
    }
  end

  def endpoint
    @base_url.end_with?('/chat/completions') ? @base_url : "#{@base_url}/chat/completions"
  end

  # Returns the assistant text, or raises NotConfiguredError / PromptTooLargeError / ProviderError.
  def complete(messages, model: nil)
    raise NotConfiguredError, 'AI provider is not configured' unless configured?
    raise PromptTooLargeError, 'AI prompt is too large' if messages.sum { |m| m[:content].to_s.length } > MAX_PROMPT_CHARS

    text = gemini? ? call_gemini(messages) : call_openai_compatible(messages, model || @model)
    Kchat::AiHealth.clear_failure!
    self.class.strip_think(text)
  rescue ProviderError => e
    Kchat::AiHealth.record_failure! if e.provider_down?
    raise
  rescue *NETWORK_ERRORS, JSON::ParserError => e
    Kchat::AiHealth.record_failure!
    raise ProviderError, "AI provider failed: #{e.class}"
  end

  def generate_reply_suggestion(conversation_messages, brand_profile: {})
    messages = [{ role: 'system', content: build_system_prompt(brand_profile) }]
    conversation_messages.each do |msg|
      messages << { role: msg.incoming? ? 'user' : 'assistant', content: msg.content.to_s }
    end
    enforce_brand_guardrails(complete(messages), hard_bans_of(brand_profile))[:sanitized_text]
  end

  def summarize_conversation(conversation_messages)
    transcript = conversation_messages.map { |m| "#{m.sender&.name || m.message_type}: #{m.content}" }.join("\n")
    complete([
               { role: 'system', content: 'Tóm tắt ngắn gọn cuộc hội thoại CSKH sau trong 3 gạch đầu dòng tiếng Việt.' },
               { role: 'user', content: transcript }
             ])
  end

  def generate_brand_chat_reply(message:, brand_profile: {}, history: [])
    messages = [{ role: 'system', content: build_system_prompt(brand_profile) }]
    Array(history).last(6).each do |h|
      h = h.to_h.stringify_keys
      messages << { role: h['role'] == 'assistant' ? 'assistant' : 'user', content: h['content'].to_s } if h['content'].present?
    end
    messages << { role: 'user', content: message.to_s }

    check = enforce_brand_guardrails(complete(messages), hard_bans_of(brand_profile))
    { reply: check[:sanitized_text], guardrail_triggered: check[:triggered], blocked_phrases: check[:blocked_phrases] }
  end

  def self.strip_think(text)
    cleaned = text.to_s.gsub(%r{<think>.*?</think>}m, '')
    cleaned = cleaned.sub(%r{\A.*?</think>}m, '') if cleaned.include?('</think>')
    cleaned.strip
  end

  def self.extract_json(text)
    cleaned = strip_think(text).gsub(/\A```(?:json)?\s*|\s*```\z/m, '').strip
    JSON.parse(cleaned)
  rescue JSON::ParserError
    match = cleaned.match(/\{.*\}/m)
    raise if match.nil?

    JSON.parse(match[0])
  end

  def enforce_brand_guardrails(text, custom_bans = nil)
    sanitized = self.class.strip_think(text)
    blocked = normalize_hard_bans(custom_bans).select do |phrase|
      regex = /#{Regexp.escape(phrase)}/i
      next false unless sanitized.match?(regex)

      sanitized = sanitized.gsub(regex, BAN_REPLACEMENT)
      true
    end
    { sanitized_text: sanitized, triggered: blocked.any?, blocked_phrases: blocked }
  end

  BRAND_PROMPT_FIELDS = [
    ['positioning', 'Định vị thương hiệu'],
    ['usp', 'Điểm khác biệt (USP)'],
    ['persona', 'Khách hàng mục tiêu'],
    ['tone', 'Giọng văn']
  ].freeze

  def build_system_prompt(brand_profile = {})
    profile = brand_profile.to_h.stringify_keys
    lines = ["Bạn là nhân viên tư vấn của thương hiệu #{profile['brand_name'].presence || 'này'}."]
    BRAND_PROMPT_FIELDS.each do |key, label|
      lines << "- #{label}: #{profile[key]}" if profile[key].present?
    end
    lines << "- Tuyệt đối không dùng các cụm từ: #{normalize_hard_bans(profile['hard_bans']).join(', ')}."
    lines << '- Trả lời ngắn gọn (2-4 câu), đúng trọng tâm, không bịa thông tin sản phẩm hay khuyến mãi.'
    lines.join("\n")
  end

  private

  def gemini?
    @provider == 'gemini_api'
  end

  def gemini_model
    ENV.fetch('GEMINI_MODEL', 'gemini-2.5-flash')
  end

  def hard_bans_of(brand_profile)
    brand_profile.to_h.stringify_keys['hard_bans']
  end

  def normalize_hard_bans(custom_bans)
    parsed = custom_bans.is_a?(String) ? custom_bans.split(/[,;\n]/) : Array(custom_bans)
    (DEFAULT_HARD_BANS + parsed).map { |b| b.to_s.strip }.reject(&:empty?).uniq
  end

  def call_openai_compatible(messages, model)
    response = HTTParty.post(
      endpoint,
      headers: { 'Content-Type' => 'application/json', 'Authorization' => "Bearer #{@api_key}" },
      body: { model: model, messages: messages, temperature: 0.7 }.to_json,
      timeout: 35
    )
    raise ProviderError.new("AI provider error: HTTP #{response.code}", status: response.code) unless response.success?

    JSON.parse(response.body).dig('choices', 0, 'message', 'content')
  end

  # API key goes in a header, never in the URL, so it does not end up in proxy/access logs.
  def call_gemini(messages)
    system_text = messages.select { |m| m[:role] == 'system' }.pluck(:content).join("\n")
    contents = messages.reject { |m| m[:role] == 'system' }.map do |m|
      { role: m[:role] == 'assistant' ? 'model' : 'user', parts: [{ text: m[:content] }] }
    end
    response = HTTParty.post(
      format(GEMINI_API_TEMPLATE, model: gemini_model),
      headers: { 'Content-Type' => 'application/json', 'x-goog-api-key' => ENV.fetch('GEMINI_API_KEY') },
      body: { system_instruction: { parts: [{ text: system_text }] }, contents: contents }.to_json,
      timeout: 35
    )
    raise ProviderError.new("AI provider error: HTTP #{response.code}", status: response.code) unless response.success?

    JSON.parse(response.body).dig('candidates', 0, 'content', 'parts', 0, 'text')
  end
end
