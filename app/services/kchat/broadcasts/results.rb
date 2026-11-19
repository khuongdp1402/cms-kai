# frozen_string_literal: true

# Outcome of one broadcast, counted from real rows only. A metric the channel cannot report is nil (never 0).
class Kchat::Broadcasts::Results
  COUNTED_ORDER_STATUSES = %w[pending_payment paid shipping completed].freeze
  ATTRIBUTION_DAYS = 7

  def initialize(account, record)
    @account = account
    @record = record
  end

  def summary
    {
      broadcast: @record,
      results: {
        eligible_count: @record['eligible_count'].to_i, sent_count: @record['sent_count'].to_i,
        failed_count: @record['failed_count'].to_i, skipped_24h_count: @record['skipped_24h_count'].to_i,
        delivery_failed_count: messages.where(status: :failed).count,
        read_supported: read_supported?, read_count: read_supported? ? messages.where(status: :read).count : nil,
        replied_count: replied_count, attribution_days: ATTRIBUTION_DAYS, **order_totals
      }
    }
  end

  private

  def started_at
    @started_at ||= Time.zone.parse(@record['started_at'].presence || @record['created_at'].to_s)
  end

  def attribution_window
    started_at..(started_at + ATTRIBUTION_DAYS.days)
  end

  def channel_type
    @account.inboxes.find_by(id: @record['inbox_id'])&.channel_type
  end

  def read_supported?
    Kchat::Broadcasts::Channels.capabilities(channel_type)[:read_status]
  end

  def messages
    # inbox_id + created_at let Postgres use index_messages_on_account_created_type / _account_id_and_inbox_id.
    Message.reorder(nil).where(account_id: @account.id, inbox_id: @record['inbox_id'], message_type: :outgoing, created_at: started_at..)
           .where("messages.additional_attributes->>'kchat_broadcast_id' = ?", @record['id'])
  end

  def conversation_ids
    @conversation_ids ||= messages.distinct.pluck(:conversation_id)
  end

  # Contacts who wrote back in the conversation the broadcast went to, after it was sent.
  def replied_count
    return 0 if conversation_ids.empty?

    Message.reorder(nil).where(account_id: @account.id, conversation_id: conversation_ids, message_type: :incoming)
           .where(created_at: started_at..)
           .distinct.count(:conversation_id)
  end

  # Orders placed within ATTRIBUTION_DAYS after the send in a broadcast conversation, or in a conversation that came
  # in through a link carrying this campaign's utm_campaign (web widget referer, see Kchat::AttributionExtractor).
  def order_totals
    return { orders_count: 0, revenue: 0 } if started_at.nil?

    orders = Kchat::Order.where(account_id: @account.id, status: COUNTED_ORDER_STATUSES, created_at: attribution_window)
                         .where(conversation_id: attributed_conversation_ids)
    paid = orders.where(status: Kchat::Reports::PAID_STATUSES)
    { orders_count: orders.count, revenue: paid.sum(:total).to_i }
  end

  def attributed_conversation_ids
    utm = @account.conversations.where("conversations.additional_attributes->>'utm_campaign' = ?", @record['campaign_tag'].to_s)
                  .where(created_at: attribution_window)
                  .pluck(:id)
    (conversation_ids + utm).uniq
  end
end
