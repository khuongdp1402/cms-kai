# frozen_string_literal: true

class Kchat::SocialComments::IngestService
  COMMENT_LABEL = 'binh-luan'
  ADD_VERBS = ['', 'add'].freeze

  def self.from_facebook_entry(entry)
    data = entry.with_indifferent_access
    channels = Channel::FacebookPage.where(page_id: data[:id].to_s)
    return if channels.empty?

    Array(data[:changes]).each do |change|
      next unless valid_fb_comment_change?(change)

      channels.each { |channel| new(channel: channel, platform: 'facebook', payload: change[:value]).perform }
    end
  end

  def self.valid_fb_comment_change?(change)
    return false unless change[:field].to_s == 'feed'

    value = change[:value]
    value.is_a?(Hash) && value[:item].to_s == 'comment' && ADD_VERBS.include?(value[:verb].to_s)
  end

  def self.from_instagram_entry(entry)
    data = entry.with_indifferent_access
    ig_id = data[:id].to_s
    channel = Channel::Instagram.find_by(instagram_id: ig_id) || Channel::FacebookPage.find_by(instagram_id: ig_id)
    return if channel.nil?

    Array(data[:changes]).each do |change|
      next unless change[:field].to_s == 'comments' && change[:value].is_a?(Hash)

      new(channel: channel, platform: 'instagram', payload: change[:value]).perform
    end
  end

  def initialize(channel:, platform:, payload:)
    @channel = channel
    @account = channel.account
    @inbox = channel.inbox
    @platform = platform
    @payload = payload.with_indifferent_access
  end

  def perform
    return nil if @inbox.nil? || comment_id.blank? || text.blank? || self_comment?

    rules = rules_service.rules
    return nil if !rules['enabled'] || Message.exists?(account_id: @account.id, source_id: source_key)

    contact_inbox = find_or_create_contact_inbox
    conversation = find_or_create_conversation(contact_inbox)
    ensure_comment_label(conversation)
    message = create_comment_message(conversation, contact_inbox.contact)
    apply_auto_hide!(rules, conversation, message)
    apply_auto_private_reply!(rules, conversation, contact_inbox.contact)
    message
  end

  private

  def comment_id
    @comment_id ||= (@payload[:comment_id].presence || @payload[:id]).to_s.strip
  end

  def post_id
    @post_id ||= (@payload[:post_id].presence || @payload.dig(:media, :id)).to_s.strip.presence
  end

  def text
    @text ||= (@payload[:message].presence || @payload[:text]).to_s.strip
  end

  def author_id
    @author_id ||= @payload.dig(:from, :id).to_s.strip
  end

  def author_name
    (@payload.dig(:from, :name).presence || @payload.dig(:from, :username).presence || 'Khách bình luận').to_s.strip
  end

  def source_key
    "comment:#{comment_id}"
  end

  def self_comment?
    return false if author_id.blank?

    [@channel.try(:page_id), @channel.try(:instagram_id)].compact.map(&:to_s).include?(author_id)
  end

  def rules_service
    @rules_service ||= Kchat::SocialComments::RulesService.new(@account)
  end

  def graph_client
    @graph_client ||= Kchat::SocialComments::GraphClient.new(channel: @channel, platform: @platform)
  end

  def find_or_create_contact_inbox
    ContactInboxWithContactBuilder.new(
      inbox: @inbox,
      source_id: source_key,
      contact_attributes: { name: author_name, identifier: author_id.presence ? "#{@platform}_user:#{author_id}" : nil }.compact
    ).perform
  end

  def find_or_create_conversation(contact_inbox)
    existing = Conversation.where(account_id: @account.id, inbox_id: @inbox.id, contact_inbox_id: contact_inbox.id)
                           .where.not(status: :resolved)
                           .order(created_at: :desc)
                           .first
    return existing if existing.present?

    Conversation.create!(
      account_id: @account.id,
      inbox_id: @inbox.id,
      contact_id: contact_inbox.contact_id,
      contact_inbox_id: contact_inbox.id,
      additional_attributes: comment_conversation_attributes
    )
  end

  def comment_conversation_attributes
    {
      'source_type' => 'social_comment', 'platform' => @platform, 'comment_id' => comment_id,
      'post_id' => post_id, 'permalink' => @payload[:permalink_url].to_s.strip.presence,
      'utm_source' => @platform, 'utm_campaign' => post_id ? "comment_#{post_id}" : nil
    }.compact
  end

  def ensure_comment_label(conversation)
    @account.labels.find_or_create_by!(title: COMMENT_LABEL)
    conversation.add_labels([COMMENT_LABEL]) unless conversation.label_list.include?(COMMENT_LABEL)
  rescue ActiveRecord::RecordNotUnique
    conversation.add_labels([COMMENT_LABEL]) unless conversation.label_list.include?(COMMENT_LABEL)
  end

  def create_comment_message(conversation, contact)
    conversation.messages.create!(
      account_id: @account.id,
      inbox_id: @inbox.id,
      message_type: :incoming,
      sender: contact,
      content: text,
      source_id: source_key,
      content_attributes: { 'comment_id' => comment_id, 'post_id' => post_id, 'platform' => @platform }.compact
    )
  end

  def apply_auto_hide!(rules, conversation, message)
    detection = rules_service.detect_sensitive_content(text)
    should_hide = (rules['auto_hide_phone'] && detection[:phone_detected]) || detection[:matched_keywords].any?
    return unless should_hide

    response = graph_client.hide_comment(comment_id)
    return unless response&.success?

    message.update!(content_attributes: message.content_attributes.merge('comment_hidden' => true))
    add_activity_note(conversation, 'Đã tự động ẩn bình luận chứa SĐT / từ khóa nhạy cảm')
  rescue StandardError => e
    Rails.logger.warn("[Kchat::SocialComments] auto_hide failed comment=#{comment_id}: #{e.message}")
  end

  def apply_auto_private_reply!(rules, conversation, contact)
    template = rules['private_reply_template'].to_s
    return unless private_reply_needed?(rules, conversation, template)

    reply_text = template.gsub('{{name}}', contact.name.presence || 'bạn').gsub('{{shop_name}}', @account.name.to_s)
    response = graph_client.send_private_reply(comment_id, reply_text)
    record_private_reply!(conversation) if response&.success?
  rescue StandardError => e
    Rails.logger.warn("[Kchat::SocialComments] private_reply failed comment=#{comment_id}: #{e.message}")
  end

  def private_reply_needed?(rules, conversation, template)
    rules['auto_private_reply'] && template.present? && !conversation.additional_attributes&.dig('private_reply_sent')
  end

  def record_private_reply!(conversation)
    conversation.update!(additional_attributes: conversation.additional_attributes.merge('private_reply_sent' => true))
    add_activity_note(conversation, 'Đã gửi tin nhắn riêng (Private Reply) tự động cho khách bình luận')
  end

  def add_activity_note(conversation, content)
    conversation.messages.create!(account_id: @account.id, inbox_id: @inbox.id, message_type: :activity, content: content)
  end
end
