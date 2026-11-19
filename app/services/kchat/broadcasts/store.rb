# frozen_string_literal: true

# The broadcast list in `account.custom_attributes['kchat_broadcasts']`. Every read-check-write runs inside
# the account row lock, so status transitions (send a draft, claim a run, delete) cannot happen twice.
class Kchat::Broadcasts::Store
  MAX_BROADCASTS = 30
  EVICTABLE_STATUSES = %w[completed failed].freeze
  RUNNABLE_STATUSES = %w[processing scheduled].freeze
  # A run that never finished (worker killed mid-send, or the job was never enqueued) after this long is failed.
  STALL_AFTER = { 'sending' => 2.hours, 'processing' => 30.minutes }.freeze

  def initialize(account)
    @account = account
  end

  def list
    Array(@account.reload.custom_attributes.to_h['kchat_broadcasts'])
  end

  # New record in front. When the list is full the oldest finished campaign makes room; drafts and
  # campaigns still to be sent are never dropped.
  def add!(record)
    mutate do |items|
      record['campaign_tag'] = self.class.unique_tag(record['campaign_tag'], items.filter_map { |item| item['campaign_tag'] })
      [record] + make_room(items)
    end
    record
  end

  # Yields the current record inside the lock; the block returns the replacement (or raises).
  # `to_front` moves it to the top of the list (a draft that is now being sent or scheduled).
  def update!(broadcast_id, to_front: false)
    updated = nil
    mutate do |items|
      others = items.reject { |item| item['id'] == broadcast_id }
      updated = with_unique_tag(yield(find_in(items, broadcast_id)), others)
      next [updated] + others if to_front

      items.map { |item| item['id'] == broadcast_id ? updated : item }
    end
    updated
  end

  def merge!(broadcast_id, changes)
    update!(broadcast_id) { |current| current.merge(changes) }
  end

  # Moves a processing/scheduled record to 'sending' exactly once; nil when it is not runnable.
  def claim!(broadcast_id)
    claimed = nil
    mutate do |items|
      items.map do |item|
        next item unless item['id'] == broadcast_id && RUNNABLE_STATUSES.include?(item['status'])

        claimed = item.merge('status' => 'sending', 'started_at' => Time.current.iso8601)
      end
    end
    claimed
  end

  # Cheap when nothing is stalled: only takes the lock when a record needs failing.
  def reap_stalled!
    return unless list.any? { |item| stalled?(item) }

    mutate do |items|
      items.map { |item| stalled?(item) ? item.merge('status' => 'failed', 'error' => 'stalled', 'completed_at' => Time.current.iso8601) : item }
    end
  end

  # Attribution groups by tag, so two campaigns never share one: suffix -2, -3… when taken.
  def self.unique_tag(base, taken)
    return base unless taken.include?(base)

    (2..).each do |n|
      candidate = "#{base.first(46)}-#{n}"
      return candidate unless taken.include?(candidate)
    end
  end

  def delete!(broadcast_id)
    mutate do |items|
      current = find_in(items, broadcast_id)
      yield(current) if block_given?
      items.reject { |item| item['id'] == broadcast_id }
    end
  end

  private

  def find_in(items, broadcast_id)
    items.find { |item| item['id'] == broadcast_id } || raise(ActiveRecord::RecordNotFound, "Broadcast #{broadcast_id} not found")
  end

  def with_unique_tag(record, others)
    return record if record['campaign_tag'].blank?

    record.merge('campaign_tag' => self.class.unique_tag(record['campaign_tag'], others.filter_map { |item| item['campaign_tag'] }))
  end

  def stalled?(item)
    limit = STALL_AFTER[item['status']]
    since = item['status'] == 'sending' ? item['started_at'] : item['queued_at'] || item['created_at']
    limit.present? && since.present? && Time.zone.parse(since) < limit.ago
  end

  def make_room(items)
    return items if items.size < MAX_BROADCASTS

    index = items.rindex { |item| EVICTABLE_STATUSES.include?(item['status']) }
    raise Kchat::BroadcastsService::ValidationError, 'broadcast_limit_reached' if index.nil?

    items.dup.tap { |list| list.delete_at(index) }
  end

  def mutate
    @account.with_lock do
      attrs = @account.custom_attributes.to_h.deep_dup
      attrs['kchat_broadcasts'] = yield(Array(attrs['kchat_broadcasts']))
      @account.update!(custom_attributes: attrs)
    end
  end
end
