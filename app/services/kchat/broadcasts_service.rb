# frozen_string_literal: true

class Kchat::BroadcastsService
  class ValidationError < StandardError; end

  MAX_BROADCASTS = 30
  MAX_TITLE_CHARS = 120
  MAX_MESSAGE_CHARS = 2_000
  META_24H_CHANNELS = Kchat::Broadcasts::Dispatcher::META_24H_CHANNELS

  def initialize(account)
    @account = account
    @dispatcher = Kchat::Broadcasts::Dispatcher.new(account)
  end

  def list
    Array(@account.custom_attributes.to_h['kchat_broadcasts'])
  end

  def preview(inbox_id:, labels: [], only_24h: false)
    inbox = @account.inboxes.find(inbox_id)
    enforce_24h = boolean_cast(only_24h) || META_24H_CHANNELS.include?(inbox.channel_type)
    partitioned = @dispatcher.partition_recipients(inbox: inbox, labels: normalize_labels(labels), enforce_24h: enforce_24h)

    {
      inbox_id: inbox.id,
      inbox_name: inbox.name,
      channel_type: inbox.channel_type.demodulize.underscore,
      requires_24h_window: META_24H_CHANNELS.include?(inbox.channel_type),
      eligible_count: partitioned[:eligible].size,
      skipped_24h_count: partitioned[:skipped_24h].size
    }
  end

  def create_broadcast!(user:, params:)
    attrs = params.to_h.with_indifferent_access
    record = build_broadcast_record(user, attrs)
    persist_broadcast!(record)
    enqueue_job(record['id'], scheduled_at: record['status'] == 'scheduled' ? parse_scheduled_at(attrs[:scheduled_at]) : nil)
    record
  end

  def execute_broadcast!(broadcast_id)
    record = list.find { |item| item['id'] == broadcast_id }
    return if record.nil? || record['status'] == 'completed'

    inbox = @account.inboxes.find_by(id: record['inbox_id'])
    sender = @account.users.find_by(id: record['sender_id']) || @account.administrators.first
    result = if inbox && sender
               @dispatcher.deliver_batch(record, inbox: inbox, sender: sender)
             else
               { status: 'failed', sent_count: 0, failed_count: 0, skipped_24h_count: 0 }
             end
    finalize_broadcast!(broadcast_id, result)
  end

  private

  def build_broadcast_record(user, attrs)
    parsed = extract_broadcast_inputs(attrs)
    stats = preview(inbox_id: attrs[:inbox_id], labels: parsed[:labels], only_24h: parsed[:only_24h])
    scheduled_future = parsed[:scheduled_at].present? && parsed[:scheduled_at] > Time.current

    parsed.except(:scheduled_at).transform_keys(&:to_s).merge(
      'id' => SecureRandom.uuid, 'inbox_id' => stats[:inbox_id], 'inbox_name' => stats[:inbox_name],
      'channel_type' => stats[:channel_type], 'requires_24h_window' => stats[:requires_24h_window],
      'status' => scheduled_future ? 'scheduled' : 'processing',
      'scheduled_at' => parsed[:scheduled_at]&.iso8601,
      'eligible_count' => stats[:eligible_count], 'skipped_24h_count' => stats[:skipped_24h_count],
      'sent_count' => 0, 'failed_count' => 0, 'sender_id' => user.id, 'created_at' => Time.current.iso8601
    )
  end

  def extract_broadcast_inputs(attrs)
    title = validate_presence_and_length!(attrs[:title], 'tiêu đề chiến dịch', MAX_TITLE_CHARS)
    {
      title: title,
      message: validate_presence_and_length!(attrs[:message], 'nội dung tin nhắn', MAX_MESSAGE_CHARS),
      labels: normalize_labels(attrs[:labels]),
      only_24h: boolean_cast(attrs[:only_24h]),
      campaign_tag: normalize_campaign_tag(attrs[:campaign_tag].presence || title),
      scheduled_at: parse_scheduled_at(attrs[:scheduled_at])
    }
  end

  def persist_broadcast!(record)
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      items = Array(attrs['kchat_broadcasts'])
      attrs['kchat_broadcasts'] = ([record] + items).first(MAX_BROADCASTS)
      @account.update!(custom_attributes: attrs)
    end
  end

  def finalize_broadcast!(broadcast_id, result)
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      target = Array(attrs['kchat_broadcasts']).find { |item| item['id'] == broadcast_id }
      if target
        target.merge!(result.transform_keys(&:to_s))['completed_at'] = Time.current.iso8601
        @account.update!(custom_attributes: attrs)
      end
      target
    end
  end

  def enqueue_job(broadcast_id, scheduled_at: nil)
    if scheduled_at.present?
      Kchat::SendBroadcastJob.set(wait_until: scheduled_at).perform_later(@account.id, broadcast_id)
    else
      Kchat::SendBroadcastJob.perform_later(@account.id, broadcast_id)
    end
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
