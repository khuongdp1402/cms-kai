# frozen_string_literal: true

# Dashboard summary for one account. Revenue is the total of orders paid/shipping/completed, bucketed by paid_at
# in the account's reporting timezone (default: Vietnam, see DEFAULT_TIMEZONE). Each section is a single aggregated query.
class Kchat::Reports
  RANGES = %w[today 7d month].freeze
  PAID_STATUSES = %w[paid shipping completed].freeze
  TOP_PRODUCTS_LIMIT = 5
  # Kalo shops are Vietnamese: accounts without a (valid) reporting_timezone report in Vietnam time, not UTC.
  # Override with the KCHAT_DEFAULT_TIMEZONE env var.
  DEFAULT_TIMEZONE = (ActiveSupport::TimeZone[ENV.fetch('KCHAT_DEFAULT_TIMEZONE', '')] || ActiveSupport::TimeZone['Asia/Ho_Chi_Minh']).name.freeze

  def initialize(account, range)
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @account = account
    @range = range
    @zone = Kchat::Metrics.zone_for(account)
  end

  # revenue/orders_count: paid orders (the orders behind the revenue); new_orders_count: every non-cancelled order created
  # in the period ("Đơn mới"); new_contacts: contacts created in the period who wrote or bought ("Khách mới"). Definitions
  # live in Kchat::Metrics, shared with Tổng quan.
  def summary
    totals = metrics.totals
    {
      range: @range, today: today.iso8601, revenue: totals[:revenue], orders_count: totals[:paid_orders_count],
      new_orders_count: totals[:new_orders_count],
      new_contacts: metrics.new_customers_count,
      waiting_messages: Conversation.where(account_id: @account.id, status: :open).where.not(waiting_since: nil).count,
      channels: channels, daily: daily, top_products: top_products
    }
  end

  private

  def metrics
    @metrics ||= Kchat::Metrics.new(@account, @range)
  end

  delegate :today, :first_day, :window, :paid_orders, to: :metrics

  def daily
    day_sql = Kchat::Order.sanitize_sql_array(["(kchat_orders.paid_at AT TIME ZONE 'UTC' AT TIME ZONE ?)::date", @zone.tzinfo.name])
    revenue = paid_orders.group(Arel.sql(day_sql)).sum(:total).transform_keys(&:to_date)
    (first_day..today).map { |day| { date: day.iso8601, revenue: revenue.fetch(day, 0).to_i } }
  end

  # Where the new orders came from: chat orders under their inbox channel (e.g. facebook_page), the rest under their source.
  def channels
    counts = metrics.channel_rows.select { |row| row[:orders].positive? }.to_h { |row| [row[:channel], row[:orders]] }
    shares = largest_remainder_shares(counts)
    counts.sort_by { |name, count| [-count, name] }.map { |name, count| { channel: name, orders: count, share_pct: shares[name] } }
  end

  # Integer percentages that always add up to 100.
  def largest_remainder_shares(counts)
    total = counts.values.sum
    return {} if total.zero?

    exact = counts.transform_values { |count| count * 100.0 / total }
    shares = exact.transform_values(&:floor)
    (100 - shares.values.sum).times { |i| shares[exact.keys.sort_by { |k| [-(exact[k] - shares[k]), k] }[i]] += 1 }
    shares
  end

  def top_products
    Kchat::OrderItem.joins(:order).joins('INNER JOIN kchat_products ON kchat_products.id = kchat_order_items.product_id')
                    .merge(paid_orders)
                    .group('kchat_products.id', 'kchat_products.name', 'kchat_products.stock')
                    .order(Arel.sql('SUM(kchat_order_items.unit_price * kchat_order_items.quantity) DESC'), 'kchat_products.id')
                    .limit(TOP_PRODUCTS_LIMIT)
                    .pluck(Arel.sql('kchat_products.name'), Arel.sql('SUM(kchat_order_items.quantity)'),
                           Arel.sql('SUM(kchat_order_items.unit_price * kchat_order_items.quantity)'), Arel.sql('kchat_products.stock'))
                    .map { |name, sold, revenue, stock| { name: name, sold: sold.to_i, revenue: revenue.to_i, stock: stock } }
  end
end
