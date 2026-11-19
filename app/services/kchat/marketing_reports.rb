# frozen_string_literal: true

class Kchat::MarketingReports
  RANGES = Kchat::Reports::RANGES
  PAID_STATUSES = Kchat::Reports::PAID_STATUSES
  TOP_CAMPAIGNS_LIMIT = 15
  TOP_AGENTS_LIMIT = 15

  CAMPAIGN_SQL = <<~SQL.squish.freeze
    COALESCE(
      NULLIF(conversations.additional_attributes->>'utm_campaign', ''),
      NULLIF(TRIM(SPLIT_PART(COALESCE(conversations.cached_label_list, ''), ',', 1)), '')
    )
  SQL

  SOURCE_SQL = <<~SQL.squish.freeze
    COALESCE(
      NULLIF(conversations.additional_attributes->>'utm_source', ''),
      inboxes.channel_type
    )
  SQL

  def self.brands_overview(user:, range: 'today')
    Kchat::BrandsOverviewReport.new(user: user, range: range).summary
  end

  def initialize(account, range)
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @account = account
    @range = range
    @zone = Kchat::Metrics.zone_for(account)
  end

  # Channel funnel and totals come from Kchat::Metrics (same definitions as Tổng quan). Campaign and agent rows follow them:
  # orders = non-cancelled chat orders created in the period, conversion = conversations with an order / conversations,
  # revenue = paid revenue in the period.
  def funnel
    {
      range: @range,
      totals: summarize_totals,
      channel_funnel: metrics.channel_rows,
      campaigns: build_campaigns,
      agents: build_agents
    }
  end

  private

  def metrics
    @metrics ||= Kchat::Metrics.new(@account, @range)
  end

  delegate :window, :paid_orders, :chat_orders, to: :metrics

  # conversion_pct is the overall chat close rate; counter (POS/manual) orders are reported apart and never enter it.
  def summarize_totals
    totals = metrics.totals
    {
      conversations_count: totals[:chat_conversations_count],
      converted_conversations_count: totals[:converted_conversations_count],
      orders_count: totals[:chat_orders_count],
      counter_orders_count: totals[:counter_orders_count],
      conversion_pct: totals[:chat_conversion_pct],
      revenue: totals[:revenue],
      avg_order_value: totals[:avg_order_value]
    }
  end

  def build_campaigns
    buckets = {}
    merge_campaign_leads(buckets)
    merge_campaign_orders(buckets)
    buckets.values
           .map { |row| row.except(:converted).merge(conversion_pct: percentage(row[:converted], row[:conversations])) }
           .sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:campaign]] }
           .first(TOP_CAMPAIGNS_LIMIT)
  end

  def merge_campaign_leads(buckets)
    rel = Conversation.joins(:inbox).where(account_id: @account.id, created_at: window)
                      .where("#{CAMPAIGN_SQL} IS NOT NULL").group(Arel.sql(CAMPAIGN_SQL), Arel.sql(SOURCE_SQL))
                      .select(Arel.sql("#{CAMPAIGN_SQL} AS campaign_key, #{SOURCE_SQL} AS source_key, COUNT(*) AS cnt, " \
                                       "#{Kchat::Metrics::CONVERTED_COUNT_SQL} AS converted"))
    ActiveRecord::Base.connection.select_rows(rel.to_sql).each do |campaign, source, count, converted|
      row = campaign_bucket(buckets, campaign, source)
      next unless row

      row[:conversations] += count.to_i
      row[:converted] += converted.to_i
    end
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
    rel = scope.joins(conversation: :inbox).where("#{CAMPAIGN_SQL} IS NOT NULL")
               .group(Arel.sql(CAMPAIGN_SQL), Arel.sql(SOURCE_SQL))
               .select(Arel.sql("#{CAMPAIGN_SQL} AS c_key, #{SOURCE_SQL} AS s_key, #{aggregate} AS value"))
    ActiveRecord::Base.connection.select_rows(rel.to_sql)
  end

  def campaign_bucket(buckets, campaign, source)
    name = campaign.to_s.strip
    return nil if name.empty?

    key = [name, normalize_channel(source)]
    buckets[key] ||= { campaign: key[0], source: key[1], conversations: 0, converted: 0, orders: 0, revenue: 0 }
  end

  def build_agents
    buckets = {}
    merge_agent_leads(buckets)
    merge_agent_orders(buckets)
    return [] if buckets.empty?

    names = User.where(id: buckets.keys).pluck(:id, :name).to_h
    rows = buckets.values.map do |row|
      row.except(:converted).merge(name: names.fetch(row[:agent_id], "##{row[:agent_id]}"),
                                   conversion_pct: percentage(row[:converted], row[:conversations]))
    end
    rows.sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:agent_id]] }.first(TOP_AGENTS_LIMIT)
  end

  def merge_agent_leads(buckets)
    metrics.conversations.where.not(assignee_id: nil).group(:assignee_id)
           .pluck(:assignee_id, Arel.sql('COUNT(*)'), Arel.sql(Kchat::Metrics::CONVERTED_COUNT_SQL)).each do |id, count, converted|
      row = agent_bucket(buckets, id)
      row[:conversations] += count.to_i
      row[:converted] += converted.to_i
    end
  end

  def merge_agent_orders(buckets)
    agent_order_rows(chat_orders, 'COUNT(*)').each { |id, count| agent_bucket(buckets, id)[:orders] += count.to_i }
    agent_order_rows(paid_orders, 'COALESCE(SUM(kchat_orders.total), 0)').each { |id, rev| agent_bucket(buckets, id)[:revenue] += rev.to_i }
  end

  def agent_order_rows(scope, aggregate)
    scope.joins(:conversation).where.not(conversations: { assignee_id: nil }).group('conversations.assignee_id')
         .pluck('conversations.assignee_id', Arel.sql(aggregate))
  end

  def agent_bucket(buckets, id)
    buckets[id] ||= { agent_id: id, conversations: 0, converted: 0, orders: 0, revenue: 0 }
  end

  def normalize_channel(value)
    Kchat::Metrics.normalize_channel(value)
  end

  def percentage(numerator, denominator)
    Kchat::Metrics.percentage(numerator, denominator)
  end
end
