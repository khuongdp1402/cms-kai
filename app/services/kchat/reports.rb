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
    @zone = ActiveSupport::TimeZone[account.reporting_timezone.to_s] || ActiveSupport::TimeZone[DEFAULT_TIMEZONE]
  end

  def summary
    totals = paid_orders.pick(Arel.sql('COALESCE(SUM(kchat_orders.total), 0)'), Arel.sql('COUNT(*)'))
    {
      range: @range, revenue: totals[0].to_i, orders_count: totals[1].to_i,
      new_contacts: Contact.where(account_id: @account.id, created_at: window).count,
      waiting_messages: Conversation.where(account_id: @account.id, status: :open).where.not(waiting_since: nil).count,
      channels: channels, daily: daily, top_products: top_products
    }
  end

  private

  def today
    @today ||= @zone.now.to_date
  end

  def first_day
    { 'today' => today, '7d' => today - 6, 'month' => today.beginning_of_month }[@range]
  end

  def window
    @window ||= @zone.local(first_day.year, first_day.month, first_day.day)..@zone.now.end_of_day
  end

  def paid_orders
    Kchat::Order.where(account_id: @account.id, status: PAID_STATUSES, paid_at: window)
  end

  def daily
    day_sql = Kchat::Order.sanitize_sql_array(["(kchat_orders.paid_at AT TIME ZONE 'UTC' AT TIME ZONE ?)::date", @zone.tzinfo.name])
    revenue = paid_orders.group(Arel.sql(day_sql)).sum(:total).transform_keys(&:to_date)
    (first_day..today).map { |day| { date: day.iso8601, revenue: revenue.fetch(day, 0).to_i } }
  end

  # Orders from a conversation count under the inbox channel (e.g. facebook_page); others under their source.
  def channels
    rows = paid_orders.left_joins(conversation: :inbox).group('kchat_orders.source', 'inboxes.channel_type').count
    counts = rows.each_with_object(Hash.new(0)) do |((source, channel_type), count), memo|
      memo[channel_type ? channel_type.demodulize.underscore : source] += count
    end
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
