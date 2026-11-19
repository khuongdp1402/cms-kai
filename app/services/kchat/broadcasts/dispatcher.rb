# frozen_string_literal: true

# Recipients are contacts who wrote to the shop in the inbox (at least one incoming message in one of their conversations
# there). Website visitors the widget only created a contact for are never messaged, and a broadcast never opens a new
# conversation: it goes into the contact's last conversation in the inbox.
class Kchat::Broadcasts::Dispatcher
  MAX_RECIPIENTS_PER_RUN = 500
  META_24H_CHANNELS = Kchat::Broadcasts::Channels::META_24H_CHANNELS
  FALLBACK_NAME = 'bạn'
  # ContactInboxWithContactBuilder names anonymous visitors with Haikunator.haikunate(1000), e.g. "lingering-grass-348".
  GENERATED_NAME = /\A[a-z]+-[a-z]+-\d{1,4}\z/
  SOCIAL_COMMENT_SQL = "COALESCE(conversations.additional_attributes->>'source_type', '') = 'social_comment'"
  # The conversation has at least one message from the customer.
  CUSTOMER_WROTE_SQL = <<~SQL.squish.freeze
    EXISTS (SELECT 1 FROM messages customer_messages WHERE customer_messages.conversation_id = conversations.id
    AND customer_messages.message_type = #{Message.message_types[:incoming]})
  SQL
  # The contact inbox has a (non comment) conversation in which the customer wrote at least once.
  CHATTED_SQL = <<~SQL.squish.freeze
    EXISTS (SELECT 1 FROM conversations WHERE conversations.contact_inbox_id = contact_inboxes.id
    AND #{CUSTOMER_WROTE_SQL} AND NOT (#{SOCIAL_COMMENT_SQL}))
  SQL

  # What {{name}} becomes for this contact; the wizard preview uses the same rule. A name the widget generated is not
  # the customer's name, so it gets the neutral greeting too.
  def self.recipient_name(contact)
    name = contact&.name.to_s.strip
    name.empty? || GENERATED_NAME.match?(name) ? FALLBACK_NAME : name
  end

  def initialize(account)
    @account = account
  end

  # contact_ids: nil means no segment restriction; an array (possibly empty) restricts recipients to those contacts.
  def partition_recipients(inbox:, labels:, enforce_24h:, contact_ids: nil)
    scope = base_contact_inbox_scope(inbox)
    scope = scope.where(contact_id: contact_ids) unless contact_ids.nil?
    if labels.any?
      matching_contact_ids = filtered_contact_ids(inbox.id, labels)
      return { eligible: [], skipped_24h: [] } if matching_contact_ids.empty?

      scope = scope.where(contact_id: matching_contact_ids)
    end

    candidates = scope.includes(:contact).order(:id).to_a.uniq(&:contact_id)
    split_by_24h_window(candidates, inbox.id, enforce_24h)
  end

  def deliver_batch(record, inbox:, sender:, contact_ids: nil)
    enforce_24h = ActiveModel::Type::Boolean.new.cast(record['only_24h']) || META_24H_CHANNELS.include?(inbox.channel_type)
    partitioned = partition_recipients(inbox: inbox, labels: Array(record['labels']), enforce_24h: enforce_24h, contact_ids: contact_ids)
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
                .where(CHATTED_SQL)
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
    conversation = last_conversation(contact_inbox)
    return false if conversation.nil?

    tag_conversation(conversation, record)
    text = personalize_message(record['message'], contact_inbox.contact, hard_bans)
    # campaign_id: Chatwoot does not count a campaign message as a human reply, so a broadcast neither sets the first reply
    # time nor clears waiting_since.
    msg_params = ActionController::Parameters.new(content: text, message_type: 'outgoing', private: false, campaign_id: record['id'])
    message = Messages::MessageBuilder.new(sender, conversation, msg_params).perform
    mark_broadcast_message(message, record['id'])
    true
  rescue StandardError => e
    Rails.logger.warn("[Kchat::Broadcasts] delivery failed contact_inbox=#{contact_inbox.id}: #{e.message}")
    false
  end

  # Lets the results view find exactly the messages of this broadcast (read status, replies after it).
  # update_columns: a plain marker, no message-updated event or channel resend.
  def mark_broadcast_message(message, broadcast_id)
    attrs = message.additional_attributes.to_h.merge('kchat_broadcast_id' => broadcast_id)
    message.update_columns(additional_attributes: attrs) # rubocop:disable Rails/SkipsModelValidations
  end

  # The latest conversation the customer wrote in (CHATTED_SQL guarantees there is one).
  def last_conversation(contact_inbox)
    contact_inbox.conversations.where.not(SOCIAL_COMMENT_SQL).where(CUSTOMER_WROTE_SQL).order(created_at: :desc, id: :desc).first
  end

  # The campaign gets its own keys so an ad's utm_source/utm_campaign on the same conversation stays intact.
  # kchat_campaign_at: replies and orders count for the campaign only from this moment (Kchat::MarketingReports, like Results).
  def tag_conversation(conversation, record)
    campaign_tag = record['campaign_tag']
    attrs = conversation.additional_attributes.to_h.merge('kchat_broadcast_tag' => campaign_tag,
                                                          'kchat_campaign_at' => record['started_at'].presence || Time.current.iso8601)
    conversation.update!(additional_attributes: attrs)
    conversation.add_labels([campaign_tag]) unless conversation.label_list.include?(campaign_tag)
  end

  def personalize_message(template, contact, hard_bans)
    body = template.to_s.gsub('{{name}}', self.class.recipient_name(contact)).gsub('{{shop_name}}', @account.name.to_s)
    Ai::CustomLlmService.new.enforce_brand_guardrails(body, hard_bans)[:sanitized_text]
  end

  def ensure_campaign_label(tag)
    return if tag.blank?

    @account.labels.find_or_create_by!(title: tag)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
    nil
  end
end
