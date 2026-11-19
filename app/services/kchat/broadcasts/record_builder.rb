# frozen_string_literal: true

# Validates wizard input and builds the stored broadcast hash (draft or ready to send).
class Kchat::Broadcasts::RecordBuilder
  MAX_TITLE_CHARS = 120
  MAX_MESSAGE_CHARS = 2_000
  GOALS = %w[sales retention launch].freeze
  ValidationError = Kchat::BroadcastsService::ValidationError

  # stats: ->(attrs) { inbox preview hash }; taken_tags: campaign tags of the other broadcasts.
  def initialize(account, stats:, taken_tags:)
    @account = account
    @stats = stats
    @taken_tags = taken_tags
  end

  def draft(user, attrs)
    title = presence_and_length!(attrs[:title], 'tiêu đề chiến dịch', MAX_TITLE_CHARS)
    message = attrs[:message].to_s.strip
    raise ValidationError, "nội dung tin nhắn tối đa #{MAX_MESSAGE_CHARS} ký tự" if message.length > MAX_MESSAGE_CHARS

    inbox = attrs[:inbox_id].present? ? @account.inboxes.find(attrs[:inbox_id]) : nil
    common(user, attrs, title).merge(
      'message' => message, 'inbox_id' => inbox&.id, 'inbox_name' => inbox&.name,
      'channel_type' => inbox&.channel_type&.demodulize&.underscore, 'status' => 'draft',
      'scheduled_at' => self.class.parse_time(attrs[:scheduled_at])&.iso8601
    )
  end

  def ready(user, attrs)
    title = presence_and_length!(attrs[:title], 'tiêu đề chiến dịch', MAX_TITLE_CHARS)
    message = presence_and_length!(attrs[:message], 'nội dung tin nhắn', MAX_MESSAGE_CHARS)
    raise ValidationError, 'Vui lòng chọn kênh gửi' if attrs[:inbox_id].blank?

    scheduled_at = self.class.parse_time(attrs[:scheduled_at])
    raise ValidationError, 'schedule_in_past' if scheduled_at && scheduled_at <= Time.current

    stats = @stats.call(attrs)
    common(user, attrs, title).merge(
      'message' => message, 'inbox_id' => stats[:inbox_id], 'inbox_name' => stats[:inbox_name],
      'channel_type' => stats[:channel_type], 'requires_24h_window' => stats[:requires_24h_window],
      'status' => scheduled_at ? 'scheduled' : 'processing', 'scheduled_at' => scheduled_at&.iso8601,
      'eligible_count' => stats[:eligible_count], 'skipped_24h_count' => stats[:skipped_24h_count]
    )
  end

  def self.parse_time(raw)
    return nil if raw.blank?

    Time.zone.parse(raw.to_s) || raise(ValidationError, 'Thời gian hẹn gửi không hợp lệ')
  rescue ArgumentError
    raise ValidationError, 'Thời gian hẹn gửi không hợp lệ'
  end

  def self.normalize_labels(raw)
    list = raw.is_a?(String) ? raw.split(/[,;\n]/) : Array(raw)
    list.map { |item| item.to_s.strip.downcase }.reject(&:empty?).uniq
  end

  def self.normalize_tag(raw)
    slug = raw.to_s.unicode_normalize(:nfkd).gsub(/[\u0300-\u036f]/, '').tr('đĐ', 'dd')
              .downcase.gsub(/[^a-z0-9_-]+/, '_').gsub(/\A[_-]+|[_-]+\z/, '').first(50)
    slug.presence || 'broadcast'
  end

  private

  def common(user, attrs, title)
    goal = attrs[:goal].presence
    raise ValidationError, 'Mục tiêu chiến dịch không hợp lệ' if goal && GOALS.exclude?(goal)

    {
      'id' => SecureRandom.uuid, 'title' => title, 'goal' => goal, 'labels' => self.class.normalize_labels(attrs[:labels]),
      'segment_id' => attrs[:segment_id].presence&.to_i, 'only_24h' => ActiveModel::Type::Boolean.new.cast(attrs[:only_24h]) == true,
      'campaign_tag' => unique_tag(self.class.normalize_tag(attrs[:campaign_tag].presence || title)),
      'sent_count' => 0, 'failed_count' => 0, 'sender_id' => user.id, 'created_at' => Time.current.iso8601
    }
  end

  # Attribution groups by tag, so two campaigns never share one: suffix -2, -3… when taken.
  def unique_tag(base)
    return base unless @taken_tags.include?(base)

    (2..).each do |n|
      candidate = "#{base.first(46)}-#{n}"
      return candidate unless @taken_tags.include?(candidate)
    end
  end

  def presence_and_length!(value, field_label, max_length)
    str = value.to_s.strip
    raise ValidationError, "Vui lòng nhập #{field_label}" if str.empty?
    raise ValidationError, "#{field_label} tối đa #{max_length} ký tự" if str.length > max_length

    str
  end
end
