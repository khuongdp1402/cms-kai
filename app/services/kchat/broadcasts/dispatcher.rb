# frozen_string_literal: true

class Kchat::Broadcasts::Dispatcher
  MAX_RECIPIENTS_PER_RUN = 500
  META_24H_CHANNELS = %w[Channel::FacebookPage Channel::Instagram].freeze

  def initialize(account)
    @account = account
  end

  def partition_recipients(inbox:, labels:, enforce_24h:)
    scope = base_contact_inbox_scope(inbox)
    if labels.any?
      matching_contact_ids = filtered_contact_ids(inbox.id, labels)
      return { eligible: [], skipped_24h: [] } if matching_contact_ids.empty?

      scope = scope.where(contact_id: matching_contact_ids)
    end

    candidates = scope.includes(:contact).order(:id).to_a.uniq(&:contact_id)
    split_by_24h_window(candidates, inbox.id, enforce_24h)
  end

  def deliver_batch(record, inbox:, sender:)
    enforce_24h = ActiveModel::Type::Boolean.new.cast(record['only_24h']) || META_24H_CHANNELS.include?(inbox.channel_type)
    partitioned = partition_recipients(inbox: inbox, labels: Array(record['labels']), enforce_24h: enforce_24h)
    ensure_campaign_label(record['campaign_tag'])
    hard_bans = @account.custom_attributes.to_h.dig('brand_growth', 'profile', 'hard_bans')

    sent_count = 0
    failed_count = 0
    partitioned[:eligible].first(MAX_RECIPIENTS_PER_RUN).each do |contact_inbox|
      deliver_to_recipient(contact_inbox, sender, record, hard_bans) ? sent_count += 1 : failed_count += 1
    end

    { status: 'completed', sent_count: sent_count, failed_count: failed_count, skipped_24h_count: partitioned[:skipped_24h].size }
  end

  private

  def base_contact_inbox_scope(inbox)
    ContactInbox.joins(:contact)
                .where(inbox_id: inbox.id, contacts: { account_id: @account.id })
                .where("contact_inboxes.source_id NOT LIKE 'comment:%'")
  end

  def split_by_24h_window(candidates, inbox_id, enforce_24h)
    return { eligible: [], skipped_24h: [] } if candidates.empty?
    return { eligible: candidates, skipped_24h: [] } unless enforce_24h

    recent_ids = recent_24h_contact_ids(inbox_id, candidates.map(&:contact_id))
    eligible, skipped = candidates.partition { |ci| recent_ids.include?(ci.contact_id) }
    { eligible: eligible, skipped_24h: skipped }
  end

  def filtered_contact_ids(inbox_id, labels)
    by_contact = @account.contacts.tagged_with(labels, any: true).pluck(:id)
    by_conversation = @account.conversations.where(inbox_id: inbox_id).tagged_with(labels, any: true).pluck(:contact_id)
    (by_contact + by_conversation).uniq
  end

  def recent_24h_contact_ids(inbox_id, contact_ids)
    Message.reorder(nil)
           .joins(:conversation)
           .where(account_id: @account.id, inbox_id: inbox_id, message_type: :incoming, created_at: 24.hours.ago..)
           .where("COALESCE(conversations.additional_attributes->>'source_type', '') <> 'social_comment'")
           .where(conversations: { contact_id: contact_ids })
           .distinct
           .pluck('conversations.contact_id')
           .to_set
  end

  def deliver_to_recipient(contact_inbox, sender, record, hard_bans)
    conversation = find_or_create_conversation(contact_inbox)
    tag_conversation(conversation, record['campaign_tag'])
    text = personalize_message(record['message'], contact_inbox.contact, hard_bans)
    msg_params = ActionController::Parameters.new(content: text, message_type: 'outgoing', private: false)
    Messages::MessageBuilder.new(sender, conversation, msg_params).perform
    true
  rescue StandardError => e
    Rails.logger.warn("[Kchat::Broadcasts] delivery failed contact_inbox=#{contact_inbox.id}: #{e.message}")
    false
  end

  def find_or_create_conversation(contact_inbox)
    contact_inbox.conversations.where.not(status: :resolved).order(created_at: :desc).first ||
      ConversationBuilder.new(params: { status: :open }, contact_inbox: contact_inbox).perform
  end

  def tag_conversation(conversation, campaign_tag)
    attrs = conversation.additional_attributes.to_h.merge('utm_source' => 'broadcast', 'utm_campaign' => campaign_tag)
    conversation.update!(additional_attributes: attrs)
    conversation.add_labels([campaign_tag]) unless conversation.label_list.include?(campaign_tag)
  end

  def personalize_message(template, contact, hard_bans)
    body = template.to_s.gsub('{{name}}', contact.name.presence || 'bạn').gsub('{{shop_name}}', @account.name.to_s)
    Ai::CustomLlmService.new.enforce_brand_guardrails(body, hard_bans)[:sanitized_text]
  end

  def ensure_campaign_label(tag)
    return if tag.blank?

    @account.labels.find_or_create_by!(title: tag)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
    nil
  end
end
