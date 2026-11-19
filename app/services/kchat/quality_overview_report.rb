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
    @zone = Kchat::Metrics.zone_for(account)
  end

  def summary
    { range: @range, kpis: build_kpis, sku_quality: build_sku_quality,
      channel_quality: build_channel_quality, action_queue: build_action_queue }
  end

  private

  # Sales and chat numbers come from Kchat::Metrics, the same definitions as the Báo cáo page.
  def metrics
    @metrics ||= Kchat::Metrics.new(@account, @range)
  end

  def window
    metrics.window
  end

  def open_waiting_scope
    @open_waiting_scope ||= Conversation.where(account_id: @account.id, status: :open).where.not(waiting_since: nil)
  end

  def build_kpis
    order_kpis.merge(sla_kpis, conversation_kpis, marketing_kpis)
  end

  def order_kpis
    totals = metrics.totals
    pending_qr = Kchat::Order.where(account_id: @account.id, status: 'pending_payment', payment_method: 'transfer_qr').count
    cancelled_cnt = Kchat::Order.where(account_id: @account.id, status: 'cancelled', updated_at: window).count

    {
      revenue: totals[:revenue],
      orders_count: totals[:paid_orders_count],
      aov: totals[:avg_order_value],
      new_orders_count: totals[:new_orders_count],
      pending_qr_count: pending_qr,
      cancelled_orders_count: cancelled_cnt
    }
  end

  def conversation_kpis
    totals = metrics.totals
    {
      conversations_count: totals[:chat_conversations_count],
      conversations_with_orders: totals[:converted_conversations_count],
      chat_orders_count: totals[:chat_orders_count],
      chat_to_order_cvr_pct: totals[:chat_conversion_pct]
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

  # Customer's first message → first staff reply, broadcasts excluded (definition in Kchat::Metrics).
  def replied_sla_metrics
    metrics.first_response_stats(SLA_TARGET_SECONDS)
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

  # Same rows as the Báo cáo funnel; counter sales (POS, manual) have cvr_pct nil. Waiting conversations are added per channel.
  def build_channel_quality
    waiting = waiting_over_15m_by_channel
    rows = metrics.channel_rows.map do |row|
      { channel: row[:channel], chat: row[:chat], conversations_count: row[:conversations], orders_count: row[:orders],
        cvr_pct: row[:conversion_pct], waiting_over_15m_count: waiting.delete(row[:channel]).to_i }
    end
    rows + waiting.map do |channel, count|
      { channel: channel, chat: true, conversations_count: 0, orders_count: 0, cvr_pct: 0.0, waiting_over_15m_count: count }
    end
  end

  def waiting_over_15m_by_channel
    open_waiting_scope.joins(:inbox).where(waiting_since: ..WAIT_ALERT_MINUTES.minutes.ago).group('inboxes.channel_type').count
                      .transform_keys { |channel_type| Kchat::Metrics.normalize_channel(channel_type) }
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
