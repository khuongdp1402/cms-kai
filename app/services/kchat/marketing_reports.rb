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
    @zone = ActiveSupport::TimeZone[account.reporting_timezone.to_s] || ActiveSupport::TimeZone[Kchat::Reports::DEFAULT_TIMEZONE]
  end

  def funnel
    channel_data = build_channel_funnel
    {
      range: @range,
      totals: summarize_totals(channel_data),
      channel_funnel: channel_data,
      campaigns: build_campaigns,
      agents: build_agents
    }
  end

  private

  def window
    @window ||= Kchat::BrandsOverviewReport.build_window(@zone, @range)
  end

  def paid_orders
    Kchat::Order.where(account_id: @account.id, status: PAID_STATUSES, paid_at: window)
  end

  def summarize_totals(channel_data)
    convs = channel_data.sum { |row| row[:conversations] }
    orders = channel_data.sum { |row| row[:orders] }
    revenue = channel_data.sum { |row| row[:revenue] }
    {
      conversations_count: convs,
      orders_count: orders,
      conversion_pct: percentage(orders, convs),
      revenue: revenue,
      avg_order_value: average(revenue, orders)
    }
  end

  def build_channel_funnel
    leads = channel_lead_counts
    orders, revenues = channel_order_totals
    rows = (leads.keys | orders.keys).map do |channel|
      conv_count = leads[channel]
      order_count = orders[channel]
      rev = revenues[channel]
      { channel: channel, conversations: conv_count, orders: order_count,
        conversion_pct: percentage(order_count, conv_count), revenue: rev, avg_order_value: average(rev, order_count) }
    end
    rows.sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:channel]] }
  end

  def channel_lead_counts
    rows = Conversation.joins(:inbox).where(account_id: @account.id, created_at: window).group('inboxes.channel_type').count
    rows.each_with_object(Hash.new(0)) { |(ch_type, cnt), memo| memo[normalize_channel(ch_type)] += cnt.to_i }
  end

  def channel_order_totals
    orders = Hash.new(0)
    revenues = Hash.new(0)
    paid_orders.left_joins(conversation: :inbox)
               .group('kchat_orders.source', 'inboxes.channel_type')
               .pluck('kchat_orders.source', 'inboxes.channel_type', Arel.sql('COUNT(*)'), Arel.sql('COALESCE(SUM(kchat_orders.total), 0)'))
               .each do |source, channel_type, count, revenue|
      key = channel_type.present? ? normalize_channel(channel_type) : source.to_s
      orders[key] += count.to_i
      revenues[key] += revenue.to_i
    end
    [orders, revenues]
  end

  def build_campaigns
    buckets = {}
    merge_campaign_leads(buckets)
    merge_campaign_orders(buckets)
    buckets.values
           .map { |row| row.merge(conversion_pct: percentage(row[:orders], row[:conversations])) }
           .sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:campaign]] }
           .first(TOP_CAMPAIGNS_LIMIT)
  end

  def merge_campaign_leads(buckets)
    rel = Conversation.joins(:inbox).where(account_id: @account.id, created_at: window)
                      .where("#{CAMPAIGN_SQL} IS NOT NULL").group(Arel.sql(CAMPAIGN_SQL), Arel.sql(SOURCE_SQL))
                      .select(Arel.sql("#{CAMPAIGN_SQL} AS campaign_key, #{SOURCE_SQL} AS source_key, COUNT(*) AS cnt"))
    ActiveRecord::Base.connection.select_rows(rel.to_sql).each do |campaign, source, count|
      row = campaign_bucket(buckets, campaign, source)
      row[:conversations] += count.to_i if row
    end
  end

  def merge_campaign_orders(buckets)
    sel = "#{CAMPAIGN_SQL} AS c_key, #{SOURCE_SQL} AS s_key, COUNT(*) AS cnt, COALESCE(SUM(kchat_orders.total), 0) AS rev"
    rel = paid_orders.joins(conversation: :inbox).where("#{CAMPAIGN_SQL} IS NOT NULL")
                     .group(Arel.sql(CAMPAIGN_SQL), Arel.sql(SOURCE_SQL))
                     .select(Arel.sql(sel))
    ActiveRecord::Base.connection.select_rows(rel.to_sql).each do |campaign, source, count, revenue|
      row = campaign_bucket(buckets, campaign, source)
      next unless row

      row[:orders] += count.to_i
      row[:revenue] += revenue.to_i
    end
  end

  def campaign_bucket(buckets, campaign, source)
    name = campaign.to_s.strip
    return nil if name.empty?

    key = [name, normalize_channel(source)]
    buckets[key] ||= { campaign: key[0], source: key[1], conversations: 0, orders: 0, revenue: 0 }
  end

  def build_agents
    buckets = {}
    merge_agent_leads(buckets)
    merge_agent_orders(buckets)
    return [] if buckets.empty?

    names = User.where(id: buckets.keys).pluck(:id, :name).to_h
    rows = buckets.values.map do |row|
      row.merge(name: names.fetch(row[:agent_id], "##{row[:agent_id]}"), conversion_pct: percentage(row[:orders], row[:conversations]))
    end
    rows.sort_by { |row| [-row[:revenue], -row[:orders], -row[:conversations], row[:agent_id]] }.first(TOP_AGENTS_LIMIT)
  end

  def merge_agent_leads(buckets)
    Conversation.where(account_id: @account.id, created_at: window).where.not(assignee_id: nil).group(:assignee_id).count.each do |id, count|
      (buckets[id] ||= { agent_id: id, conversations: 0, orders: 0, revenue: 0 })[:conversations] += count.to_i
    end
  end

  def merge_agent_orders(buckets)
    paid_orders.joins(:conversation).where.not(conversations: { assignee_id: nil }).group('conversations.assignee_id')
               .pluck('conversations.assignee_id', Arel.sql('COUNT(*)'), Arel.sql('COALESCE(SUM(kchat_orders.total), 0)')).each do |id, cnt, rev|
      row = (buckets[id] ||= { agent_id: id, conversations: 0, orders: 0, revenue: 0 })
      row[:orders] += cnt.to_i
      row[:revenue] += rev.to_i
    end
  end

  def normalize_channel(value)
    raw = value.to_s.strip
    return 'unknown' if raw.empty?

    raw.start_with?('Channel::') ? raw.demodulize.underscore : raw
  end

  def percentage(numerator, denominator)
    denominator.to_i <= 0 ? 0.0 : (numerator.to_f * 100.0 / denominator).round(1)
  end

  def average(total, count)
    count.to_i <= 0 ? 0 : (total.to_f / count).round
  end
end
