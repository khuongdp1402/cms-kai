# frozen_string_literal: true

# Output-quality & SLA overview metrics for one shop account.
# Combines real order fulfillment, conversation SLA, AI/content readiness, and SKU quality.
class Kchat::QualityOverviewReport
  RANGES = Kchat::Reports::RANGES
  PAID_STATUSES = Kchat::Reports::PAID_STATUSES
  SLA_TARGET_SECONDS = 300
  WAIT_ALERT_MINUTES = 15
  LOW_STOCK_THRESHOLD = 3
  CANCEL_ATTENTION_PCT = 15.0
  SCHEDULED_STATUSES = %w[scheduled published].freeze
  # Message#content_attributes is a json column with `coder: JSON`, so the hash
  # is stored as a JSON string; unwrap it before reading a key.
  CONTENT_ATTRS = "(content_attributes #>> '{}')::jsonb"

  SKU_SELECT = [
    'kchat_products.id AS product_id',
    'kchat_products.name AS name',
    'kchat_products.stock AS stock',
    "COALESCE(SUM(CASE WHEN kchat_orders.status IN ('paid','shipping','completed') " \
    'THEN kchat_order_items.quantity ELSE 0 END), 0) AS sold_qty',
    "COALESCE(SUM(CASE WHEN kchat_orders.status = 'cancelled' THEN kchat_order_items.quantity ELSE 0 END), 0) AS cancelled_qty",
    "COALESCE(SUM(CASE WHEN kchat_orders.status IN ('paid','shipping','completed') " \
    'THEN kchat_order_items.unit_price * kchat_order_items.quantity ELSE 0 END), 0) AS revenue'
  ].join(', ').freeze

  def initialize(account, range)
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @account = account
    @range = range
    @zone = ActiveSupport::TimeZone[account.reporting_timezone.to_s] ||
            ActiveSupport::TimeZone[Kchat::Reports::DEFAULT_TIMEZONE]
  end

  def summary
    { range: @range, kpis: build_kpis, sku_quality: build_sku_quality,
      channel_quality: build_channel_quality, action_queue: build_action_queue }
  end

  private

  def window
    @window ||= Kchat::BrandsOverviewReport.build_window(@zone, @range)
  end

  def paid_orders_scope
    @paid_orders_scope ||= Kchat::Order.where(
      account_id: @account.id,
      status: PAID_STATUSES,
      paid_at: window
    )
  end

  def conversations_scope
    @conversations_scope ||= Conversation.where(account_id: @account.id, created_at: window)
  end

  def open_waiting_scope
    @open_waiting_scope ||= Conversation.where(account_id: @account.id, status: :open).where.not(waiting_since: nil)
  end

  def build_kpis
    order_kpis.merge(sla_kpis, conversation_kpis, marketing_kpis)
  end

  def order_kpis
    revenue, orders_count = paid_orders_scope.pick(Arel.sql('COALESCE(SUM(total), 0)'), Arel.sql('COUNT(*)'))
    rev = revenue.to_i
    cnt = orders_count.to_i
    pending_qr = Kchat::Order.where(account_id: @account.id, status: 'pending_payment', payment_method: 'transfer_qr').count
    cancelled_cnt = Kchat::Order.where(account_id: @account.id, status: 'cancelled', updated_at: window).count

    {
      revenue: rev,
      orders_count: cnt,
      aov: cnt.positive? ? (rev.to_f / cnt).round : 0,
      pending_qr_count: pending_qr,
      cancelled_orders_count: cancelled_cnt
    }
  end

  def conversation_kpis
    total_convs = conversations_scope.count
    with_orders = paid_orders_scope.where.not(conversation_id: nil).distinct.count(:conversation_id)
    {
      conversations_count: total_convs,
      conversations_with_orders: with_orders,
      chat_to_order_cvr_pct: total_convs.positive? ? (with_orders * 100.0 / total_convs).round(1) : 0.0
    }
  end

  def sla_kpis
    avg_frt, sla_pct = replied_sla_metrics
    {
      avg_first_response_seconds: avg_frt,
      sla_under_5m_pct: sla_pct,
      waiting_now_count: open_waiting_scope.count,
      waiting_over_15m_count: open_waiting_scope.where(waiting_since: ..WAIT_ALERT_MINUTES.minutes.ago).count
    }
  end

  def replied_sla_metrics
    row = conversations_scope.where.not(first_reply_created_at: nil).pick(
      Arel.sql('AVG(GREATEST(EXTRACT(EPOCH FROM (first_reply_created_at - created_at)), 0))'),
      Arel.sql("SUM(CASE WHEN EXTRACT(EPOCH FROM (first_reply_created_at - created_at)) <= #{SLA_TARGET_SECONDS} THEN 1 ELSE 0 END)"),
      Arel.sql('COUNT(*)')
    )
    replied_total = row[2].to_i
    return [nil, nil] unless replied_total.positive?

    [row[0].to_f.round, (row[1].to_i * 100.0 / replied_total).round(1)]
  end

  def marketing_kpis
    msgs = Message.where(account_id: @account.id, created_at: window)
    brand_state = @account.custom_attributes.to_h.fetch('brand_growth', {})
    calendar = Array(brand_state['calendar'])
    jobs = Array(brand_state['jobs'])

    {
      social_comments_count: msgs.where("#{CONTENT_ATTRS}->>'comment_id' IS NOT NULL").count,
      phones_protected_count: msgs.where("#{CONTENT_ATTRS}->>'comment_hidden' = 'true'").count,
      calendar_scheduled_count: calendar.count { |item| SCHEDULED_STATUSES.include?(item['status']) },
      calendar_total_count: calendar.size,
      ai_jobs_approved_count: jobs.count { |job| job['status'] == 'approved' }
    }
  end

  def build_sku_quality
    rows = ActiveRecord::Base.connection.select_rows(sku_quality_sql)
    rows.map { |row| map_sku_row(row) }
  end

  def sku_quality_sql
    Kchat::OrderItem.joins(:order)
                    .joins('INNER JOIN kchat_products ON kchat_products.id = kchat_order_items.product_id')
                    .where(kchat_orders: { account_id: @account.id, created_at: window })
                    .group('kchat_products.id', 'kchat_products.name', 'kchat_products.stock')
                    .select(SKU_SELECT)
                    .order(Arel.sql('revenue DESC, sold_qty DESC, kchat_products.id ASC'))
                    .limit(6)
                    .to_sql
  end

  def map_sku_row(row)
    product_id, name, stock, sold_qty, cancelled_qty, revenue = row
    sold = sold_qty.to_i
    cancelled = cancelled_qty.to_i
    total_units = sold + cancelled
    cancel_pct = total_units.positive? ? (cancelled * 100.0 / total_units).round(1) : 0.0
    stock_val = stock&.to_i

    {
      product_id: product_id.to_i,
      name: name.to_s,
      sold_qty: sold,
      cancelled_qty: cancelled,
      cancel_rate_pct: cancel_pct,
      revenue: revenue.to_i,
      stock: stock_val,
      needs_attention: cancel_pct >= CANCEL_ATTENTION_PCT || (!stock_val.nil? && stock_val <= LOW_STOCK_THRESHOLD)
    }
  end

  def build_channel_quality
    counts = channel_counts_by_type
    channel_types = counts[:convs].keys | counts[:orders].keys | counts[:waiting_15m].keys
    rows = channel_types.map { |ch_type| map_channel_row(ch_type, counts) }
    rows.sort_by { |row| [-row[:orders_count], -row[:conversations_count], row[:channel]] }
  end

  def channel_counts_by_type
    {
      convs: Conversation.joins(:inbox).where(account_id: @account.id, created_at: window).group('inboxes.channel_type').count,
      orders: paid_orders_scope.joins(conversation: :inbox).group('inboxes.channel_type').count,
      waiting_15m: open_waiting_scope.joins(:inbox).where(waiting_since: ..WAIT_ALERT_MINUTES.minutes.ago).group('inboxes.channel_type').count
    }
  end

  def map_channel_row(ch_type, counts)
    conv_count = counts[:convs][ch_type].to_i
    ord_count = counts[:orders][ch_type].to_i
    {
      channel: ch_type.to_s.demodulize.underscore,
      conversations_count: conv_count,
      orders_count: ord_count,
      cvr_pct: conv_count.positive? ? (ord_count * 100.0 / conv_count).round(1) : 0.0,
      waiting_over_15m_count: counts[:waiting_15m][ch_type].to_i
    }
  end

  def build_action_queue
    items = []
    w15 = open_waiting_scope.where(waiting_since: ..WAIT_ALERT_MINUTES.minutes.ago).count
    items << { key: 'waiting_over_15m', count: w15, route: 'home', tone: 'warn' } if w15.positive?
    qr_cnt = Kchat::Order.where(account_id: @account.id, status: 'pending_payment', payment_method: 'transfer_qr').count
    items << { key: 'pending_qr_orders', count: qr_cnt, route: 'kalo_orders', tone: 'warn' } if qr_cnt.positive?
    low_stock = Kchat::Product.where(account_id: @account.id, active: true).where('stock IS NOT NULL AND stock <= ?', LOW_STOCK_THRESHOLD).count
    items << { key: 'low_stock_products', count: low_stock, route: 'kalo_pos', tone: 'err' } if low_stock.positive?
    hidden_cnt = Message.where(account_id: @account.id, created_at: window).where("#{CONTENT_ATTRS}->>'comment_hidden' = 'true'").count
    items << { key: 'phones_protected', count: hidden_cnt, route: 'kalo_comments', tone: 'ok' } if hidden_cnt.positive?
    items
  end
end
