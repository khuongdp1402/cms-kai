# frozen_string_literal: true

class Kchat::BroadcastsService
  class ValidationError < StandardError; end

  MAX_BROADCASTS = Kchat::Broadcasts::Store::MAX_BROADCASTS
  MAX_TITLE_CHARS = 120
  MAX_MESSAGE_CHARS = 2_000
  META_24H_CHANNELS = Kchat::Broadcasts::Dispatcher::META_24H_CHANNELS
  FAILED_RUN = { 'status' => 'failed', 'sent_count' => 0, 'failed_count' => 0, 'skipped_24h_count' => 0 }.freeze

  def initialize(account)
    @account = account
    @dispatcher = Kchat::Broadcasts::Dispatcher.new(account)
    @store = Kchat::Broadcasts::Store.new(account)
  end

  # Reaps stalled runs first so a lost job never leaves a campaign "Đang gửi" forever.
  def list
    @store.reap_stalled!
    @store.list
  end

  # List rows plus how many of each broadcast's messages the channel later rejected (e.g. Zalo bridge send failure).
  def list_with_delivery_stats
    items = list
    failed = delivery_failures(items)
    items.map { |item| item.merge('delivery_failed_count' => failed[item['id']].to_i) }
  end

  def find!(broadcast_id)
    list.find { |item| item['id'] == broadcast_id } || raise(ActiveRecord::RecordNotFound, "Broadcast #{broadcast_id} not found")
  end

  def preview(inbox_id:, labels: [], only_24h: false, segment_id: nil)
    inbox = @account.inboxes.find(inbox_id)
    audience.inbox_stats(inbox, labels: Kchat::Broadcasts::RecordBuilder.normalize_labels(labels),
                                contact_ids: audience.segment_contact_ids(segment_id), only_24h: boolean_cast(only_24h))
  end

  # Who the chosen labels/segment reach overall, and how many of them each inbox can actually message.
  def audience_summary(labels: [], segment_id: nil)
    audience.summary(labels: Kchat::Broadcasts::RecordBuilder.normalize_labels(labels), segment_id: segment_id)
  end

  # Same guardrail the dispatcher applies at send time (default bans + brand profile hard_bans).
  def check_content(message)
    check = Ai::CustomLlmService.new.enforce_brand_guardrails(message.to_s, brand_hard_bans)
    { blocked_phrases: check[:blocked_phrases] }
  end

  def create_broadcast!(user:, params:)
    attrs = params.to_h.with_indifferent_access
    record = build(user, attrs, keep_draft: boolean_cast(attrs[:draft]))
    @store.add!(record)
    enqueue_for(record)
    record
  end

  # Drafts are editable; `draft: false` validates everything and sends (or schedules) it. A missing
  # `draft` keeps it a draft. The status check happens again inside the lock, so two sends of the
  # same draft enqueue once.
  def update_draft!(broadcast_id, user:, params:)
    current = find!(broadcast_id)
    raise ValidationError, 'Chỉ sửa được chiến dịch nháp' unless current['status'] == 'draft'

    attrs = current.slice('title', 'message', 'inbox_id', 'labels', 'segment_id', 'goal', 'campaign_tag', 'only_24h', 'scheduled_at')
                   .merge(params.to_h.stringify_keys).with_indifferent_access
    keep_draft = !attrs.key?(:draft) || attrs[:draft].nil? || boolean_cast(attrs[:draft])
    built = build(user, attrs, keep_draft: keep_draft)
    record = @store.update!(broadcast_id, to_front: !keep_draft) do |locked|
      raise ValidationError, 'Chỉ sửa được chiến dịch nháp' unless locked['status'] == 'draft'

      built.merge('id' => locked['id'], 'created_at' => locked['created_at'])
    end
    enqueue_for(record)
    record
  end

  def destroy_draft!(broadcast_id)
    @store.delete!(broadcast_id) do |locked|
      raise ValidationError, 'Chỉ xóa được chiến dịch nháp' unless locked['status'] == 'draft'
    end
  end

  def results(broadcast_id)
    Kchat::Broadcasts::Results.new(@account, find!(broadcast_id)).summary
  end

  # Runs once per broadcast: the store claims processing/scheduled → sending under the account lock.
  def execute_broadcast!(broadcast_id)
    record = @store.claim!(broadcast_id)
    return if record.nil?

    @store.merge!(broadcast_id, deliver(record).transform_keys(&:to_s).merge('completed_at' => Time.current.iso8601))
  end

  private

  def delivery_failures(items)
    started = items.filter_map { |item| item['started_at'] }.min
    return {} if started.nil?

    Message.reorder(nil)
           .where(account_id: @account.id, message_type: :outgoing, status: :failed, created_at: Time.zone.parse(started)..)
           .where(inbox_id: items.filter_map { |item| item['inbox_id'] }.uniq)
           .where("messages.additional_attributes->>'kchat_broadcast_id' IN (?)", items.pluck('id'))
           .group(Arel.sql("messages.additional_attributes->>'kchat_broadcast_id'")).count
  end

  def deliver(record)
    return FAILED_RUN.merge('error' => 'subscription_expired') if Kchat::Entitlements.status(@account) == :expired

    inbox = @account.inboxes.find_by(id: record['inbox_id'])
    sender = @account.users.find_by(id: record['sender_id']) || @account.administrators.first
    return FAILED_RUN unless inbox && sender

    @dispatcher.deliver_batch(record, inbox: inbox, sender: sender, contact_ids: audience.segment_contact_ids(record['segment_id']))
  rescue StandardError => e
    Rails.logger.error("[Kchat::Broadcasts] broadcast #{record['id']} failed: #{e.message}")
    FAILED_RUN
  end

  def build(user, attrs, keep_draft:)
    builder = Kchat::Broadcasts::RecordBuilder.new(
      @account,
      stats: lambda { |a|
        preview(inbox_id: a[:inbox_id], labels: a[:labels], only_24h: a[:only_24h], segment_id: a[:segment_id])
      }
    )
    keep_draft ? builder.draft(user, attrs) : builder.ready(user, attrs)
  end

  def enqueue_for(record)
    case record['status']
    when 'scheduled'
      Kchat::SendBroadcastJob.set(wait_until: Time.zone.parse(record['scheduled_at'])).perform_later(@account.id, record['id'])
    when 'processing'
      Kchat::SendBroadcastJob.perform_later(@account.id, record['id'])
    end
  end

  def audience
    @audience ||= Kchat::Broadcasts::Audience.new(@account, dispatcher: @dispatcher)
  end

  def brand_hard_bans
    @account.custom_attributes.to_h.dig('brand_growth', 'profile', 'hard_bans')
  end

  def boolean_cast(val)
    ActiveModel::Type::Boolean.new.cast(val) == true
  end
end
