# frozen_string_literal: true

class Kchat::BrandsOverviewReport
  RANGES = Kchat::Reports::RANGES
  PAID_STATUSES = Kchat::Reports::PAID_STATUSES

  def self.build_window(zone, range)
    today = zone.now.to_date
    first_day = { 'today' => today, '7d' => today - 6, 'month' => today.beginning_of_month }.fetch(range)
    zone.local(first_day.year, first_day.month, first_day.day)..zone.now.end_of_day
  end

  def initialize(user:, range: 'today')
    raise ArgumentError, "unknown range #{range}" unless RANGES.include?(range)

    @user = user
    @range = range
  end

  def summary
    memberships = @user.account_users.includes(:account).joins(:account).order('accounts.name ASC').to_a
    account_ids = memberships.map(&:account_id)
    return { range: @range, brands: [] } if account_ids.empty?

    window = self.class.build_window(ActiveSupport::TimeZone[Kchat::Reports::DEFAULT_TIMEZONE], @range)
    metrics = fetch_metrics(account_ids, window)
    { range: @range, brands: memberships.map { |membership| format_row(membership, metrics) } }
  end

  private

  def fetch_metrics(account_ids, window)
    rows = Kchat::Order.where(account_id: account_ids, status: PAID_STATUSES, paid_at: window)
                       .group(:account_id)
                       .pluck(:account_id, Arel.sql('COUNT(*)'), Arel.sql('COALESCE(SUM(total), 0)'))
    {
      orders: rows.each_with_object({}) { |(id, cnt, rev), memo| memo[id] = { count: cnt.to_i, revenue: rev.to_i } },
      open: Conversation.where(account_id: account_ids, status: :open).group(:account_id).count,
      waiting: Conversation.where(account_id: account_ids, status: :open).where.not(waiting_since: nil).group(:account_id).count
    }
  end

  def format_row(membership, metrics)
    acc = membership.account
    stats = metrics[:orders].fetch(acc.id, { count: 0, revenue: 0 })
    {
      id: acc.id,
      name: acc.name,
      role: membership.role,
      revenue: stats[:revenue],
      orders_count: stats[:count],
      open_conversations: metrics[:open].fetch(acc.id, 0),
      waiting_messages: metrics[:waiting].fetch(acc.id, 0)
    }
  end
end
