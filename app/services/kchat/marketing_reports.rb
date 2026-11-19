# frozen_string_literal: true

class Kchat::MarketingReports
  RANGES = Kchat::Reports::RANGES
  PAID_STATUSES = Kchat::Reports::PAID_STATUSES
  TOP_AGENTS_LIMIT = 15

  def self.brands_overview(user:, range: 'today')
    Kchat::BrandsOverviewReport.new(user: user, range: range).summary
  end

  def initialize(account, range)
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @account = account
    @range = range
    @zone = Kchat::Metrics.zone_for(account)
  end

  # Channel funnel and totals come from Kchat::Metrics (same definitions as Tổng quan). Agent rows follow them:
  # conversations = Metrics#conversations ("Khách nhắn"), orders = non-cancelled chat orders created in the period,
  # conversion = conversations with an order / conversations, revenue = paid revenue in the period.
  # Campaign rows: Kchat::MarketingReports::CampaignRows (ADR-027).
  def funnel
    {
      range: @range,
      totals: summarize_totals,
      channel_funnel: metrics.channel_rows,
      campaigns: CampaignRows.new(@account, metrics).rows,
      agents: build_agents
    }
  end

  private

  def metrics
    @metrics ||= Kchat::Metrics.new(@account, @range)
  end

  delegate :paid_orders, :chat_orders, to: :metrics

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

  def build_agents
    buckets = {}
    merge_agent_leads(buckets)
    merge_agent_orders(buckets)
    return [] if buckets.empty?

    names = User.where(id: buckets.keys).pluck(:id, :name).to_h
    rows = buckets.values.map { |row| agent_row(row, names) }
    rows.sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:agent_id]] }.first(TOP_AGENTS_LIMIT)
  end

  def agent_row(row, names)
    row.except(:converted).merge(name: names.fetch(row[:agent_id], "##{row[:agent_id]}"),
                                 conversion_pct: percentage(row[:converted], row[:conversations]))
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

  def percentage(numerator, denominator)
    Kchat::Metrics.percentage(numerator, denominator)
  end
end
