# frozen_string_literal: true

# Campaign rows of the Báo cáo funnel (ADR-027). Same order/revenue scopes as Kchat::Metrics (chat orders created in the
# period, paid revenue in the period), each order credited to one row by its creation time:
# - broadcast row (source "broadcast"): orders created from the send (kchat_campaign_at, or the broadcast's started_at for
#   older conversations) to ATTRIBUTION_DAYS later; conversations = those that wrote back after the send, with a message
#   in the period (Kchat::Broadcasts::Results replied_count). A broadcast reuses old conversations, so creation is irrelevant.
# - UTM row (ad/link utm_campaign): orders within ATTRIBUTION_DAYS of the conversation's creation; conversations =
#   Metrics#conversations.
# - label row (first label, no UTM): every order of the conversation, no window; conversations = Metrics#conversations.
class Kchat::MarketingReports::CampaignRows
  TOP_CAMPAIGNS_LIMIT = 15
  ATTRIBUTION_DAYS = Kchat::Broadcasts::Results::ATTRIBUTION_DAYS
  ATTRS = 'conversations.additional_attributes'
  # The broadcast that reached the conversation; conversations tagged before kchat_broadcast_tag existed carry it in utm_*.
  BROADCAST_TAG_SQL = "COALESCE(NULLIF(#{ATTRS}->>'kchat_broadcast_tag', ''), " \
                      "CASE WHEN #{ATTRS}->>'utm_source' = 'broadcast' THEN NULLIF(#{ATTRS}->>'utm_campaign', '') END)".freeze
  # Ad/link attribution (Kchat::AttributionExtractor), never a broadcast.
  UTM_TAG_SQL = "CASE WHEN COALESCE(#{ATTRS}->>'utm_source', '') <> 'broadcast' THEN NULLIF(#{ATTRS}->>'utm_campaign', '') END".freeze
  # First label, unless it is the label the broadcast added.
  LABEL_TAG_SQL = "NULLIF(NULLIF(TRIM(SPLIT_PART(COALESCE(conversations.cached_label_list, ''), ',', 1)), ''), #{BROADCAST_TAG_SQL})".freeze
  OTHER_SOURCE_SQL = "COALESCE(CASE WHEN COALESCE(#{ATTRS}->>'utm_source', '') <> 'broadcast' " \
                     "THEN NULLIF(#{ATTRS}->>'utm_source', '') END, inboxes.channel_type)".freeze

  def initialize(account, metrics)
    @account = account
    @metrics = metrics
  end

  def rows
    buckets = {}
    merge_campaign_leads(buckets)
    merge_broadcast_leads(buckets)
    merge_campaign_orders(buckets)
    buckets.values
           .map { |row| row.except(:converted).merge(conversion_pct: Kchat::Metrics.percentage(row[:converted], row[:conversations])) }
           .sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:campaign]] }
           .first(TOP_CAMPAIGNS_LIMIT)
  end

  # UTM and label rows: conversations of the period, keyed at their creation.
  private

  attr_reader :metrics

  delegate :window, :paid_orders, :chat_orders, to: :metrics

  def merge_campaign_leads(buckets)
    key = campaign_key_sql('conversations.created_at')
    source = campaign_source_sql('conversations.created_at')
    converted = converted_sql("#{campaign_key_sql('converted_orders.created_at')} = #{key} AND " \
                              "#{campaign_source_sql('converted_orders.created_at')} = #{source}")
    rel = metrics.conversations.joins(:inbox).where("#{key} IS NOT NULL").group(Arel.sql(key), Arel.sql(source))
                 .select(Arel.sql("#{key} AS campaign_key, #{source} AS source_key, COUNT(*) AS cnt, #{converted} AS converted"))
    add_leads(buckets, rel)
  end

  # Broadcast rows: conversations that wrote back after the send, with a customer message in the period.
  def merge_broadcast_leads(buckets)
    replied = Conversation.sanitize_sql_array(
      ['EXISTS (SELECT 1 FROM messages replies WHERE replies.conversation_id = conversations.id AND replies.message_type = ? ' \
       "AND replies.created_at >= #{campaign_start_sql} AND replies.created_at BETWEEN ? AND ?)",
       Message.message_types[:incoming], window.begin, window.end]
    )
    converted = converted_sql(in_broadcast_sql('converted_orders.created_at'))
    rel = Conversation.where(account_id: @account.id).where("#{BROADCAST_TAG_SQL} IS NOT NULL").where(replied)
                      .group(Arel.sql(BROADCAST_TAG_SQL))
                      .select(Arel.sql("#{BROADCAST_TAG_SQL} AS campaign_key, 'broadcast' AS source_key, COUNT(*) AS cnt, " \
                                       "#{converted} AS converted"))
    add_leads(buckets, rel)
  end

  def add_leads(buckets, rel)
    ActiveRecord::Base.connection.select_rows(rel.to_sql).each do |campaign, source, count, converted_count|
      row = campaign_bucket(buckets, campaign, source)
      next unless row

      row[:conversations] += count.to_i
      row[:converted] += converted_count.to_i
    end
  end

  def converted_sql(condition)
    'COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM kchat_orders converted_orders WHERE ' \
      "converted_orders.conversation_id = conversations.id AND converted_orders.status <> 'cancelled' " \
      "AND converted_orders.source <> 'pos' AND #{condition}))"
  end

  def merge_campaign_orders(buckets)
    campaign_order_rows(chat_orders, 'COUNT(*)').each do |campaign, source, count|
      campaign_bucket(buckets, campaign, source)&.then { |row| row[:orders] += count.to_i }
    end
    campaign_order_rows(paid_orders, 'COALESCE(SUM(kchat_orders.total), 0)').each do |campaign, source, revenue|
      campaign_bucket(buckets, campaign, source)&.then { |row| row[:revenue] += revenue.to_i }
    end
  end

  def campaign_order_rows(scope, aggregate)
    key = campaign_key_sql('kchat_orders.created_at')
    source = campaign_source_sql('kchat_orders.created_at')
    rel = scope.joins(conversation: :inbox).where("#{key} IS NOT NULL").group(Arel.sql(key), Arel.sql(source))
               .select(Arel.sql("#{key} AS c_key, #{source} AS s_key, #{aggregate} AS value"))
    ActiveRecord::Base.connection.select_rows(rel.to_sql)
  end

  # The campaign an event (order, conversation) of the conversation at time `at` belongs to.
  def campaign_key_sql(at)
    "(CASE WHEN #{in_broadcast_sql(at)} THEN #{BROADCAST_TAG_SQL} WHEN #{in_utm_sql(at)} THEN #{UTM_TAG_SQL} ELSE #{LABEL_TAG_SQL} END)"
  end

  def campaign_source_sql(at)
    "(CASE WHEN #{in_broadcast_sql(at)} THEN 'broadcast' ELSE #{OTHER_SOURCE_SQL} END)"
  end

  def in_broadcast_sql(at)
    "(#{BROADCAST_TAG_SQL} IS NOT NULL AND #{within_sql(at, campaign_start_sql)})"
  end

  def in_utm_sql(at)
    "(#{UTM_TAG_SQL} IS NOT NULL AND #{within_sql(at, 'conversations.created_at')})"
  end

  def within_sql(at, start)
    "#{at} >= #{start} AND #{at} <= #{start} + INTERVAL '#{ATTRIBUTION_DAYS} days'"
  end

  def campaign_start_sql
    @campaign_start_sql ||= begin
      sent = broadcast_starts.map do |tag, started_at|
        Conversation.sanitize_sql_array(['WHEN ? THEN ?::timestamptz', tag, started_at])
      end
      by_tag = sent.empty? ? 'NULL' : "CASE #{BROADCAST_TAG_SQL} #{sent.join(' ')} END"
      "COALESCE(NULLIF(#{ATTRS}->>'kchat_campaign_at', '')::timestamptz, #{by_tag}, conversations.created_at)"
    end
  end

  def broadcast_starts
    Array(@account.custom_attributes.to_h['kchat_broadcasts']).filter_map do |item|
      [item['campaign_tag'], item['started_at']] if item['campaign_tag'].present? && item['started_at'].present?
    end.uniq(&:first)
  end

  def campaign_bucket(buckets, campaign, source)
    name = campaign.to_s.strip
    return nil if name.empty?

    key = [name, Kchat::Metrics.normalize_channel(source)]
    buckets[key] ||= { campaign: key[0], source: key[1], conversations: 0, converted: 0, orders: 0, revenue: 0 }
  end
end
