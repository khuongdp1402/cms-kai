# frozen_string_literal: true

# Single source of truth for the sales and chat numbers shown on Tổng quan (QualityOverviewReport) and Báo cáo
# (Reports, MarketingReports), so the two pages can never disagree (LESSONS B12).
#
# Period: today / last 7 days / this month, cut at midnight in the account's reporting timezone (Asia/Ho_Chi_Minh by default).
# - revenue, paid_orders_count: orders paid, shipping or completed whose paid_at is in the period, every source.
# - avg_order_value: revenue / paid_orders_count.
# - new_orders_count: orders created in the period that are not cancelled, every source and payment state.
# - chat order: a new order linked to a conversation and not sold at the counter (source != pos).
# - counter_orders_count: new orders that are not chat orders (POS sales, manual orders without a chat).
# - chat_conversations_count ("Khách nhắn"): conversations created in the period in which the customer wrote at least one
#   message. Conversations only the shop wrote in (a campaign, an outbound chat) are not leads.
# - converted_conversations_count: those conversations that have at least one non-cancelled chat order.
# - chat_conversion_pct: converted_conversations_count / chat_conversations_count (never above 100%). Counter orders
#   never enter it; their channel rows carry conversion_pct nil.
# - new_customers_count ("Khách mới"): contacts created in the period that wrote at least one message or have at least one
#   non-cancelled order. Contacts the website widget creates for anonymous visitors are not customers.
# - first response: in those conversations, time from the customer's first message to the first public reply written by
#   a staff member after it. Campaign/broadcast messages, bots and automations are not replies.
class Kchat::Metrics
  RANGES = %w[today 7d month].freeze
  PAID_STATUSES = %w[paid shipping completed].freeze
  NON_CHAT_KEYS = Kchat::Order.sources.keys.freeze
  CONVERTED_SQL = <<~SQL.squish.freeze
    EXISTS (SELECT 1 FROM kchat_orders converted_orders WHERE converted_orders.conversation_id = conversations.id
    AND converted_orders.status <> 'cancelled' AND converted_orders.source NOT IN ('pos', 'external'))
  SQL
  CONVERTED_COUNT_SQL = "COUNT(*) FILTER (WHERE #{CONVERTED_SQL})".freeze
  INCOMING = Message.message_types[:incoming]
  OUTGOING = Message.message_types[:outgoing]
  INCOMING_SQL = <<~SQL.squish.freeze
    EXISTS (SELECT 1 FROM messages incoming_messages WHERE incoming_messages.conversation_id = conversations.id
    AND incoming_messages.message_type = #{INCOMING})
  SQL
  # Each EXISTS is filtered by the contact's account so it stays on that account's rows (no OR across tables).
  CUSTOMER_SQL = <<~SQL.squish.freeze
    EXISTS (SELECT 1 FROM conversations customer_conversations JOIN messages customer_messages
    ON customer_messages.conversation_id = customer_conversations.id
    WHERE customer_conversations.account_id = contacts.account_id AND customer_conversations.contact_id = contacts.id
    AND customer_messages.message_type = #{INCOMING})
    OR EXISTS (SELECT 1 FROM kchat_orders customer_orders
    WHERE customer_orders.account_id = contacts.account_id AND customer_orders.contact_id = contacts.id
    AND customer_orders.status <> 'cancelled')
    OR EXISTS (SELECT 1 FROM conversations order_conversations JOIN kchat_orders conversation_orders
    ON conversation_orders.conversation_id = order_conversations.id
    WHERE order_conversations.account_id = contacts.account_id AND order_conversations.contact_id = contacts.id
    AND conversation_orders.account_id = contacts.account_id AND conversation_orders.status <> 'cancelled')
  SQL
  FIRST_INCOMING_JOIN = <<~SQL.squish.freeze
    CROSS JOIN LATERAL (SELECT MIN(first_messages.created_at) AS asked_at FROM messages first_messages
    WHERE first_messages.conversation_id = conversations.id AND first_messages.message_type = #{INCOMING}) first_incoming
  SQL
  FIRST_REPLY_SELECT = <<~SQL.squish.freeze
    first_incoming.asked_at AS asked_at,
    (SELECT MIN(replies.created_at) FROM messages replies WHERE replies.conversation_id = conversations.id
    AND replies.message_type = #{OUTGOING} AND replies.private = FALSE AND replies.sender_type = 'User'
    AND replies.created_at >= first_incoming.asked_at
    AND replies.additional_attributes->'campaign_id' IS NULL AND replies.additional_attributes->'kchat_broadcast_id' IS NULL
    AND COALESCE((replies.content_attributes #>> '{}')::jsonb->>'automation_rule_id', '') = '') AS replied_at
  SQL
  # Chat orders are grouped under their conversation's inbox channel, every other order under its source.
  ORDER_CHANNEL_SQL = <<~SQL.squish.freeze
    CASE WHEN kchat_orders.conversation_id IS NOT NULL AND kchat_orders.source NOT IN ('pos', 'external')
    THEN COALESCE(inboxes.channel_type, 'unknown') ELSE kchat_orders.source END
  SQL
  # Aliased on purpose: plucking the bare expression makes Rails cast the value with the `source` enum type, which turns
  # every channel type into nil.
  ORDER_CHANNEL_SELECT = "(#{ORDER_CHANNEL_SQL}) AS order_channel".freeze

  attr_reader :zone

  def self.zone_for(account)
    ActiveSupport::TimeZone[account.reporting_timezone.to_s] || ActiveSupport::TimeZone[Kchat::Reports::DEFAULT_TIMEZONE]
  end

  def self.percentage(numerator, denominator)
    denominator.to_i <= 0 ? 0.0 : (numerator.to_f * 100.0 / denominator).round(1)
  end

  def self.average(total, count)
    count.to_i <= 0 ? 0 : (total.to_f / count).round
  end

  def self.normalize_channel(value)
    raw = value.to_s.strip
    return 'unknown' if raw.empty?

    raw.start_with?('Channel::') ? raw.demodulize.underscore : raw
  end

  def initialize(account, range)
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @account = account
    @range = range
    @zone = self.class.zone_for(account)
  end

  def today
    @today ||= @zone.now.to_date
  end

  def first_day
    { 'today' => today, '7d' => today - 6, 'month' => today.beginning_of_month }.fetch(@range)
  end

  def window
    @window ||= @zone.local(first_day.year, first_day.month, first_day.day)..@zone.now.end_of_day
  end

  def paid_orders
    Kchat::Order.where(account_id: @account.id, status: PAID_STATUSES, paid_at: window)
  end

  def new_orders
    Kchat::Order.where(account_id: @account.id, created_at: window).where.not(status: 'cancelled')
  end

  def chat_orders
    new_orders.where.not(conversation_id: nil).where.not(source: %w[pos external])
  end

  def conversations
    Conversation.where(account_id: @account.id, created_at: window).where(INCOMING_SQL)
  end

  def new_customers
    Contact.where(account_id: @account.id, created_at: window).where(CUSTOMER_SQL)
  end

  def new_customers_count
    @new_customers_count ||= new_customers.count
  end

  # [average seconds, % answered within target_seconds] over the conversations that got a reply; [nil, nil] if none did.
  def first_response_stats(target_seconds)
    pairs = conversations.joins(FIRST_INCOMING_JOIN).select(Arel.sql(FIRST_REPLY_SELECT)).to_sql
    seconds = 'EXTRACT(EPOCH FROM (replied_at - asked_at))'
    avg, within, replied = ActiveRecord::Base.connection.select_rows(<<~SQL.squish).first
      SELECT AVG(GREATEST(#{seconds}, 0)), COUNT(*) FILTER (WHERE #{seconds} <= #{target_seconds.to_i}), COUNT(*)
      FROM (#{pairs}) first_replies WHERE replied_at IS NOT NULL
    SQL
    return [nil, nil] unless replied.to_i.positive?

    [avg.to_f.round, (within.to_i * 100.0 / replied.to_i).round(1)]
  end

  def totals
    @totals ||= begin
      revenue, paid_count = paid_orders.pick(Arel.sql('COALESCE(SUM(kchat_orders.total), 0)'), Arel.sql('COUNT(*)'))
      new_count, chat_count = new_orders.pick(
        Arel.sql('COUNT(*)'),
        Arel.sql("COUNT(*) FILTER (WHERE kchat_orders.conversation_id IS NOT NULL AND kchat_orders.source NOT IN ('pos', 'external'))")
      )
      convs, converted = conversations.pick(Arel.sql('COUNT(*)'), Arel.sql(CONVERTED_COUNT_SQL))
      {
        revenue: revenue.to_i, paid_orders_count: paid_count.to_i, avg_order_value: self.class.average(revenue, paid_count),
        new_orders_count: new_count.to_i, chat_orders_count: chat_count.to_i, counter_orders_count: new_count.to_i - chat_count.to_i,
        chat_conversations_count: convs.to_i, converted_conversations_count: converted.to_i,
        chat_conversion_pct: self.class.percentage(converted, convs)
      }
    end
  end

  # One row per inbox channel (chat rows) plus one per non-chat order source (pos, manual). Revenue is paid revenue,
  # so the rows add up to totals[:revenue]; orders are new orders, so they add up to totals[:new_orders_count].
  def channel_rows
    @channel_rows ||= begin
      buckets = Hash.new { |hash, key| hash[key] = { conversations: 0, converted_conversations: 0, orders: 0, paid_orders: 0, revenue: 0 } }
      merge_leads(buckets)
      merge_new_orders(buckets)
      merge_paid_orders(buckets)
      buckets.map { |channel, row| build_row(channel, row) }
             .sort_by { |row| [row[:chat] ? 0 : 1, -row[:revenue], -row[:orders], -row[:conversations], row[:channel]] }
    end
  end

  private

  def merge_leads(buckets)
    conversations.joins(:inbox).group('inboxes.channel_type')
                 .pluck('inboxes.channel_type', Arel.sql('COUNT(*)'), Arel.sql(CONVERTED_COUNT_SQL))
                 .each do |channel_type, count, converted|
      row = buckets[self.class.normalize_channel(channel_type)]
      row[:conversations] += count.to_i
      row[:converted_conversations] += converted.to_i
    end
  end

  def merge_new_orders(buckets)
    new_orders.left_joins(conversation: :inbox).group(Arel.sql(ORDER_CHANNEL_SQL))
              .pluck(Arel.sql(ORDER_CHANNEL_SELECT), Arel.sql('COUNT(*)'))
              .each { |key, count| buckets[self.class.normalize_channel(key)][:orders] += count.to_i }
  end

  def merge_paid_orders(buckets)
    paid_orders.left_joins(conversation: :inbox).group(Arel.sql(ORDER_CHANNEL_SQL))
               .pluck(Arel.sql(ORDER_CHANNEL_SELECT), Arel.sql('COUNT(*)'), Arel.sql('COALESCE(SUM(kchat_orders.total), 0)'))
               .each do |key, count, revenue|
      row = buckets[self.class.normalize_channel(key)]
      row[:paid_orders] += count.to_i
      row[:revenue] += revenue.to_i
    end
  end

  def build_row(channel, row)
    chat = NON_CHAT_KEYS.exclude?(channel)
    {
      channel: channel, chat: chat, conversations: row[:conversations], converted_conversations: row[:converted_conversations],
      orders: row[:orders], conversion_pct: chat ? self.class.percentage(row[:converted_conversations], row[:conversations]) : nil,
      revenue: row[:revenue], avg_order_value: self.class.average(row[:revenue], row[:paid_orders])
    }
  end
end
