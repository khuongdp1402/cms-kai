# frozen_string_literal: true

class Kchat::BroadcastsService
  class ValidationError < StandardError; end

  MAX_BROADCASTS = 30
  MAX_TITLE_CHARS = 120
  MAX_MESSAGE_CHARS = 2_000
  GOALS = %w[sales retention launch].freeze
  META_24H_CHANNELS = Kchat::Broadcasts::Dispatcher::META_24H_CHANNELS

  def initialize(account)
    @account = account
    @dispatcher = Kchat::Broadcasts::Dispatcher.new(account)
  end

  def list
    Array(@account.custom_attributes.to_h['kchat_broadcasts'])
  end

  # List rows plus how many of each broadcast's messages the channel later rejected (e.g. Zalo bridge send failure).
  def list_with_delivery_stats
    items = list
    failed = Message.reorder(nil).where(account_id: @account.id, message_type: :outgoing, status: :failed)
                    .where("messages.additional_attributes->>'kchat_broadcast_id' IN (?)", items.pluck('id').presence || [''])
                    .group(Arel.sql("messages.additional_attributes->>'kchat_broadcast_id'")).count
    items.map { |item| item.merge('delivery_failed_count' => failed[item['id']].to_i) }
  end

  def find!(broadcast_id)
    list.find { |item| item['id'] == broadcast_id } || raise(ActiveRecord::RecordNotFound, "Broadcast #{broadcast_id} not found")
  end

  def preview(inbox_id:, labels: [], only_24h: false, segment_id: nil)
    inbox = @account.inboxes.find(inbox_id)
    audience.inbox_stats(inbox, labels: normalize_labels(labels), contact_ids: audience.segment_contact_ids(segment_id),
                                only_24h: boolean_cast(only_24h))
  end

  # Who the chosen labels/segment reach overall, and how many of them each inbox can actually message.
  def audience_summary(labels: [], segment_id: nil)
    audience.summary(labels: normalize_labels(labels), segment_id: segment_id)
  end

  # Same guardrail the dispatcher applies at send time (default bans + brand profile hard_bans).
  def check_content(message)
    check = Ai::CustomLlmService.new.enforce_brand_guardrails(message.to_s, brand_hard_bans)
    { blocked_phrases: check[:blocked_phrases] }
  end

  def create_broadcast!(user:, params:)
    attrs = params.to_h.with_indifferent_access
    record = boolean_cast(attrs[:draft]) ? build_draft_record(user, attrs) : build_broadcast_record(user, attrs)
    persist_broadcast!(record)
    enqueue_for(record, attrs)
    record
  end

  # Drafts are editable; `draft: false` validates everything and sends (or schedules) it.
  def update_draft!(broadcast_id, user:, params:)
    current = find!(broadcast_id)
    raise ValidationError, 'Chỉ sửa được chiến dịch nháp' unless current['status'] == 'draft'

    attrs = current.slice('title', 'message', 'inbox_id', 'labels', 'segment_id', 'goal', 'campaign_tag', 'only_24h', 'scheduled_at')
                   .merge(params.to_h.stringify_keys).with_indifferent_access
    built = boolean_cast(attrs[:draft]) ? build_draft_record(user, attrs) : build_broadcast_record(user, attrs)
    record = built.merge('id' => current['id'], 'created_at' => current['created_at'])
    replace_broadcast!(record)
    enqueue_for(record, attrs)
    record
  end

  def destroy_draft!(broadcast_id)
    raise ValidationError, 'Chỉ xóa được chiến dịch nháp' unless find!(broadcast_id)['status'] == 'draft'

    mutate_list { |items| items.reject { |item| item['id'] == broadcast_id } }
  end

  def results(broadcast_id)
    Kchat::Broadcasts::Results.new(@account, find!(broadcast_id)).summary
  end

  def execute_broadcast!(broadcast_id)
    record = list.find { |item| item['id'] == broadcast_id }
    return if record.nil? || %w[completed draft].include?(record['status'])

    finalize_broadcast!(broadcast_id, 'status' => 'processing', 'started_at' => Time.current.iso8601)
    finalize_broadcast!(broadcast_id, deliver(record).transform_keys(&:to_s).merge('completed_at' => Time.current.iso8601))
  end

  private

  def deliver(record)
    inbox = @account.inboxes.find_by(id: record['inbox_id'])
    sender = @account.users.find_by(id: record['sender_id']) || @account.administrators.first
    return { status: 'failed', sent_count: 0, failed_count: 0, skipped_24h_count: 0 } unless inbox && sender

    @dispatcher.deliver_batch(record, inbox: inbox, sender: sender, contact_ids: audience.segment_contact_ids(record['segment_id']))
  rescue StandardError => e
    Rails.logger.error("[Kchat::Broadcasts] broadcast #{record['id']} failed: #{e.message}")
    { status: 'failed', sent_count: 0, failed_count: 0, skipped_24h_count: 0 }
  end

  def build_draft_record(user, attrs)
    title = validate_presence_and_length!(attrs[:title], 'tiêu đề chiến dịch', MAX_TITLE_CHARS)
    message = attrs[:message].to_s.strip
    raise ValidationError, "nội dung tin nhắn tối đa #{MAX_MESSAGE_CHARS} ký tự" if message.length > MAX_MESSAGE_CHARS

    inbox = attrs[:inbox_id].present? ? @account.inboxes.find(attrs[:inbox_id]) : nil
    common_fields(user, attrs, title).merge(
      'message' => message, 'inbox_id' => inbox&.id, 'inbox_name' => inbox&.name,
      'channel_type' => inbox&.channel_type&.demodulize&.underscore, 'status' => 'draft',
      'scheduled_at' => parse_scheduled_at(attrs[:scheduled_at])&.iso8601
    )
  end

  def build_broadcast_record(user, attrs)
    title = validate_presence_and_length!(attrs[:title], 'tiêu đề chiến dịch', MAX_TITLE_CHARS)
    message = validate_presence_and_length!(attrs[:message], 'nội dung tin nhắn', MAX_MESSAGE_CHARS)
    raise ValidationError, 'Vui lòng chọn kênh gửi' if attrs[:inbox_id].blank?

    stats = preview(inbox_id: attrs[:inbox_id], labels: attrs[:labels], only_24h: attrs[:only_24h], segment_id: attrs[:segment_id])
    scheduled_at = parse_scheduled_at(attrs[:scheduled_at])
    scheduled_future = scheduled_at.present? && scheduled_at > Time.current

    common_fields(user, attrs, title).merge(
      'message' => message, 'inbox_id' => stats[:inbox_id], 'inbox_name' => stats[:inbox_name],
      'channel_type' => stats[:channel_type], 'requires_24h_window' => stats[:requires_24h_window],
      'status' => scheduled_future ? 'scheduled' : 'processing', 'scheduled_at' => scheduled_at&.iso8601,
      'eligible_count' => stats[:eligible_count], 'skipped_24h_count' => stats[:skipped_24h_count]
    )
  end

  def common_fields(user, attrs, title)
    goal = attrs[:goal].presence
    raise ValidationError, 'Mục tiêu chiến dịch không hợp lệ' if goal && GOALS.exclude?(goal)

    {
      'id' => SecureRandom.uuid, 'title' => title, 'goal' => goal, 'labels' => normalize_labels(attrs[:labels]),
      'segment_id' => attrs[:segment_id].presence&.to_i, 'only_24h' => boolean_cast(attrs[:only_24h]),
      'campaign_tag' => normalize_campaign_tag(attrs[:campaign_tag].presence || title),
      'sent_count' => 0, 'failed_count' => 0, 'sender_id' => user.id, 'created_at' => Time.current.iso8601
    }
  end

  def enqueue_for(record, attrs)
    return if record['status'] == 'draft'

    enqueue_job(record['id'], scheduled_at: record['status'] == 'scheduled' ? parse_scheduled_at(attrs[:scheduled_at]) : nil)
  end

  def persist_broadcast!(record)
    mutate_list { |items| ([record] + items).first(MAX_BROADCASTS) }
  end

  def replace_broadcast!(record)
    mutate_list { |items| items.map { |item| item['id'] == record['id'] ? record : item } }
  end

  def finalize_broadcast!(broadcast_id, changes)
    mutate_list do |items|
      items.map { |item| item['id'] == broadcast_id ? item.merge(changes) : item }
    end
  end

  def mutate_list
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      attrs['kchat_broadcasts'] = yield(Array(attrs['kchat_broadcasts']))
      @account.update!(custom_attributes: attrs)
    end
  end

  def enqueue_job(broadcast_id, scheduled_at: nil)
    if scheduled_at.present?
      Kchat::SendBroadcastJob.set(wait_until: scheduled_at).perform_later(@account.id, broadcast_id)
    else
      Kchat::SendBroadcastJob.perform_later(@account.id, broadcast_id)
    end
  end

  def audience
    @audience ||= Kchat::Broadcasts::Audience.new(@account, dispatcher: @dispatcher)
  end

  def brand_hard_bans
    @account.custom_attributes.to_h.dig('brand_growth', 'profile', 'hard_bans')
  end

  def validate_presence_and_length!(value, field_label, max_length)
    str = value.to_s.strip
    raise ValidationError, "Vui lòng nhập #{field_label}" if str.empty?
    raise ValidationError, "#{field_label} tối đa #{max_length} ký tự" if str.length > max_length

    str
  end

  def normalize_labels(raw)
    list = raw.is_a?(String) ? raw.split(/[,;\n]/) : Array(raw)
    list.map { |item| item.to_s.strip.downcase }.reject(&:empty?).uniq
  end

  def normalize_campaign_tag(raw)
    slug = raw.to_s.unicode_normalize(:nfkd).gsub(/[\u0300-\u036f]/, '').tr('đĐ', 'dd')
              .downcase.gsub(/[^a-z0-9_-]+/, '_').gsub(/\A[_-]+|[_-]+\z/, '').first(50)
    slug.presence || 'broadcast'
  end

  def parse_scheduled_at(raw)
    return nil if raw.blank?

    Time.zone.parse(raw.to_s) || raise(ValidationError, 'Thời gian hẹn gửi không hợp lệ')
  rescue ArgumentError
    raise ValidationError, 'Thời gian hẹn gửi không hợp lệ'
  end

  def boolean_cast(val)
    ActiveModel::Type::Boolean.new.cast(val) == true
  end
end
