# frozen_string_literal: true

# Basic demand-based CSKH chatbot: greets new visitors, matches customer needs by keyword rules
# (with attached product pitches & auto-labeling), or auto-suggests matching catalog products.
class Kchat::DemandBotService
  AGENT_ACTIVE_WINDOW = 30.minutes
  RULE_COOLDOWN = 10.minutes
  DEFAULT_CONFIG = {
    'enabled' => false,
    'pause_when_agent_active' => true,
    'welcome_enabled' => true,
    'welcome_message' => 'Xin chào {{contact.name}}, shop đã nhận được tin nhắn. ' \
                         'Anh/chị cần tư vấn về sản phẩm hoặc dịch vụ nào để em hỗ trợ ngay ạ?',
    'auto_suggest_products' => true,
    'handoff_enabled' => false,
    'handoff_message' => 'Nhân viên tư vấn sẽ hỗ trợ anh/chị chi tiết ngay trong giây lát ạ.',
    'rules' => []
  }.freeze

  def self.config_for(account)
    stored = account.custom_attributes.to_h['kchat_bot']
    stored = {} unless stored.is_a?(Hash)
    DEFAULT_CONFIG.deep_dup.merge(stored)
  end

  def initialize(account)
    @account = account
    @config = self.class.config_for(account)
  end

  def process_message!(message)
    return nil unless eligible_message?(message)

    conversation = message.conversation
    return nil if agent_recently_active?(conversation)

    matched = find_matching_rule(message.content)
    if matched
      return nil if on_cooldown?(rule_hits(conversation)[matched['id']])

      return reply_from_rule(conversation, matched)
    end

    suggested = auto_suggest_reply(message.content, conversation)
    return suggested if suggested

    send_welcome_reply(conversation)
  end

  private

  def eligible_message?(message)
    return false unless @config['enabled'] == true
    return false if message.nil? || !message.incoming? || message.private? || message.activity?

    message.content.present? && message.conversation.present?
  end

  def agent_recently_active?(conversation)
    return false unless @config['pause_when_agent_active'] == true

    conversation.messages
                .where(message_type: :outgoing, private: false, sender_type: 'User')
                .where('created_at >= ?', AGENT_ACTIVE_WINDOW.ago)
                .where("COALESCE((content_attributes #>> '{}')::jsonb->>'automation_rule_id', '') = ''")
                .exists?
  end

  def find_matching_rule(text)
    downcased = text.to_s.downcase
    Array(@config['rules']).find do |rule|
      next false unless rule['active'] != false

      Array(rule['keywords']).any? { |kw| kw.present? && downcased.include?(kw.to_s.downcase) }
    end
  end

  def reply_from_rule(conversation, rule)
    body = build_rule_reply_text(conversation, rule)
    return nil if body.blank?

    apply_rule_labels(conversation, rule['assign_labels'])
    mark_rule_hit!(conversation, rule['id'])
    deliver_bot_message!(conversation, body, rule_id: rule['id'])
  end

  def build_rule_reply_text(conversation, rule)
    parts = [interpolate(rule['reply'].to_s, conversation).strip].compact_blank
    pitches = rule_product_pitches(rule['product_ids'])
    parts << pitches.join("\n\n") if pitches.any?
    parts.join("\n\n")
  end

  def rule_product_pitches(raw_ids)
    product_ids = Array(raw_ids).map(&:to_i).select(&:positive?)
    return [] if product_ids.empty?

    products = Kchat::Product.where(account_id: @account.id, active: true, id: product_ids).index_by(&:id)
    product_ids.filter_map { |id| products[id]&.formatted_pitch }
  end

  def auto_suggest_reply(text, conversation)
    return nil unless @config['auto_suggest_products'] == true
    return nil if on_cooldown?(conversation.additional_attributes['kchat_bot_auto_suggest_at'])

    matched = matching_catalog_products(text)
    return nil if matched.empty?

    mark_attr!(conversation, 'kchat_bot_auto_suggest_at')
    intro = "Dạ em gửi anh/chị thông tin các lựa chọn phù hợp:\n\n"
    body = intro + matched.map(&:formatted_pitch).join("\n\n")
    deliver_bot_message!(conversation, body, rule_id: 'auto_suggest')
  end

  def matching_catalog_products(text)
    downcased = text.to_s.downcase
    tokens = downcased.split(/[\s,.;:!?()]+/).select { |t| t.length >= 3 }.uniq
    return [] if tokens.empty? && downcased.length < 2

    Kchat::Product.where(account_id: @account.id, active: true).order(:id)
                  .select { |product| product_matches_query?(product, downcased, tokens) }
                  .first(3)
  end

  def product_matches_query?(product, downcased, tokens)
    category = product.category.to_s.downcase
    name = product.name.to_s.downcase
    return true if category.length >= 2 && downcased.include?(category)
    return true if name.length >= 3 && downcased.include?(name)

    tokens.any? { |tok| name.include?(tok) || category.include?(tok) }
  end

  def send_welcome_reply(conversation)
    return nil unless @config['welcome_enabled'] == true
    return nil if conversation.additional_attributes['kchat_bot_welcomed_at'].present?

    parts = []
    welcome = interpolate(@config['welcome_message'].to_s, conversation).strip
    parts << welcome if welcome.present?
    handoff = @config['handoff_message'].to_s.strip
    parts << handoff if @config['handoff_enabled'] == true && handoff.present?
    return nil if parts.empty?

    mark_attr!(conversation, 'kchat_bot_welcomed_at')
    deliver_bot_message!(conversation, parts.join("\n"), rule_id: 'welcome')
  end

  def apply_rule_labels(conversation, labels)
    clean = Array(labels).map { |l| l.to_s.strip }.compact_blank
    conversation.add_labels(clean) if clean.any?
  end

  def interpolate(text, conversation)
    contact_name = conversation.contact&.name.presence || 'anh/chị'
    text.gsub(/\{\{\s*contact\.name\s*\}\}/, contact_name)
  end

  def rule_hits(conversation)
    hits = conversation.additional_attributes['kchat_bot_rule_hits']
    hits.is_a?(Hash) ? hits : {}
  end

  def on_cooldown?(iso_time)
    return false if iso_time.blank?

    Time.zone.parse(iso_time.to_s) > RULE_COOLDOWN.ago
  rescue ArgumentError
    false
  end

  def mark_rule_hit!(conversation, rule_id)
    attrs = conversation.additional_attributes.to_h.deep_dup
    attrs['kchat_bot_rule_hits'] = rule_hits(conversation).merge(rule_id => Time.current.iso8601)
    conversation.update!(additional_attributes: attrs)
  end

  def mark_attr!(conversation, key)
    attrs = conversation.additional_attributes.to_h.merge(key => Time.current.iso8601)
    conversation.update!(additional_attributes: attrs)
  end

  def deliver_bot_message!(conversation, body, rule_id:)
    conversation.messages.create!(
      account: @account,
      inbox: conversation.inbox,
      message_type: :outgoing,
      content: body,
      content_attributes: { 'automation_rule_id' => 'kchat_demand_bot', 'kchat_bot_rule_id' => rule_id }
    )
  end
end
