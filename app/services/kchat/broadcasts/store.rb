# frozen_string_literal: true

# The broadcast list in `account.custom_attributes['kchat_broadcasts']`. Every read-check-write runs inside
# the account row lock, so status transitions (send a draft, claim a run, delete) cannot happen twice.
class Kchat::Broadcasts::Store
  MAX_BROADCASTS = 30
  EVICTABLE_STATUSES = %w[completed failed].freeze
  RUNNABLE_STATUSES = %w[processing scheduled].freeze

  def initialize(account)
    @account = account
  end

  def list
    Array(@account.reload.custom_attributes.to_h['kchat_broadcasts'])
  end

  # New record in front. When the list is full the oldest finished campaign makes room; drafts and
  # campaigns still to be sent are never dropped.
  def add!(record)
    mutate { |items| [record] + make_room(items) }
    record
  end

  # Yields the current record inside the lock; the block returns the replacement (or raises).
  # `to_front` moves it to the top of the list (a draft that is now being sent or scheduled).
  def update!(broadcast_id, to_front: false)
    updated = nil
    mutate do |items|
      current = items.find { |item| item['id'] == broadcast_id } || raise(ActiveRecord::RecordNotFound, "Broadcast #{broadcast_id} not found")
      updated = yield(current)
      rest = items.map { |item| item['id'] == broadcast_id ? updated : item }
      to_front ? [updated] + rest.reject { |item| item['id'] == broadcast_id } : rest
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

  def delete!(broadcast_id)
    mutate do |items|
      current = items.find { |item| item['id'] == broadcast_id } || raise(ActiveRecord::RecordNotFound, "Broadcast #{broadcast_id} not found")
      yield(current) if block_given?
      items.reject { |item| item['id'] == broadcast_id }
    end
  end

  private

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
