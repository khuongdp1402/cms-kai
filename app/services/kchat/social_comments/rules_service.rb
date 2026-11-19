# frozen_string_literal: true

class Kchat::SocialComments::RulesService
  MAX_KEYWORDS = 30
  MAX_KEYWORD_LENGTH = 60
  MAX_TEMPLATE_LENGTH = 1_000
  DEFAULT_PRIVATE_REPLY_TEMPLATE = 'Chào {{name}}, shop đã nhận được bình luận của bạn và gửi tư vấn chi tiết tại đây nhé!'

  DEFAULT_RULES = {
    'enabled' => true,
    'auto_hide_phone' => true,
    'hide_keywords' => [],
    'auto_private_reply' => false,
    'private_reply_template' => DEFAULT_PRIVATE_REPLY_TEMPLATE
  }.freeze

  # Matches Vietnamese phone numbers with 0 or +84 prefix and optional spaces/dots/dashes.
  VN_PHONE_REGEX = /(?:\+?84|0)(?:[\s.\-]*\d){8,9}\b/

  def initialize(account)
    @account = account
  end

  def rules
    stored = @account.custom_attributes.to_h['social_comment_rules'].to_h
    DEFAULT_RULES.merge(stored.slice(*DEFAULT_RULES.keys))
  end

  BOOLEAN_KEYS = %w[enabled auto_hide_phone auto_private_reply].freeze

  def update(raw_params)
    params = raw_params.to_h.stringify_keys
    next_rules = merge_rule_fields(rules.dup, params)
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      attrs['social_comment_rules'] = next_rules
      @account.update!(custom_attributes: attrs)
    end
    next_rules
  end

  def merge_rule_fields(next_rules, params)
    cast = ActiveModel::Type::Boolean.new
    BOOLEAN_KEYS.each { |key| next_rules[key] = cast.cast(params[key]) if params.key?(key) }
    next_rules['hide_keywords'] = normalize_keywords(params['hide_keywords']) if params.key?('hide_keywords')
    if params.key?('private_reply_template')
      next_rules['private_reply_template'] = params['private_reply_template'].to_s.strip.first(MAX_TEMPLATE_LENGTH)
    end
    next_rules
  end

  def detect_sensitive_content(text)
    body = text.to_s
    phone_detected = body.match?(VN_PHONE_REGEX)
    downcased = body.downcase
    matched_keywords = Array(rules['hide_keywords']).select { |kw| kw.present? && downcased.include?(kw.downcase) }
    {
      matched: phone_detected || matched_keywords.any?,
      phone_detected: phone_detected,
      matched_keywords: matched_keywords
    }
  end

  private

  def normalize_keywords(raw)
    list = raw.is_a?(String) ? raw.split(/[,;\n]/) : Array(raw)
    list.map { |item| item.to_s.strip.first(MAX_KEYWORD_LENGTH) }
        .reject(&:empty?)
        .uniq(&:downcase)
        .first(MAX_KEYWORDS)
  end
end
