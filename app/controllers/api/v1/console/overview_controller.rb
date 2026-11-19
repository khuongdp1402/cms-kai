class Api::V1::Console::OverviewController < Api::V1::Console::BaseController
  RECENT_PAYMENTS = 10
  PLAN_SQL = "accounts.custom_attributes->>'subscription_plan'".freeze

  def show
    render json: {
      shops: Account.count,
      revenue_month: Kchat::PaymentEvent.where(status: %w[matched applied],
                                               received_at: Casso::WebhookHandler::CASSO_TIME_ZONE.now.beginning_of_month..).sum(:amount),
      expiring_7d: Account.where(Kchat::AccountScopes::EXPIRING_SQL, now: Time.current, soon: 7.days.from_now).count,
      unmatched_payments: Kchat::PaymentEvent.where(status: 'unmatched').count,
      recent_payments: recent_payments.map { |e| payment_event_json(e) },
      shops_by_plan: shops_by_plan,
      health: infrastructure_health
    }
  end

  private

  def recent_payments
    Kchat::PaymentEvent.includes(:account).order(received_at: :desc, id: :desc).limit(RECENT_PAYMENTS)
  end

  def shops_by_plan
    paying = Account.active.where("#{Kchat::AccountScopes::VALID_UNTIL} > :now", now: Time.current)
    counts = paying.group(Arel.sql(PLAN_SQL)).count
    Casso::WebhookHandler::PLAN_PRICES.keys.sort_by { |plan| Casso::WebhookHandler::PLAN_PRICES[plan] }.index_with { |plan| counts.fetch(plan, 0) }
  end

  def infrastructure_health
    total_events = Kchat::PaymentEvent.count
    matched_events = Kchat::PaymentEvent.where(status: %w[matched applied]).count
    {
      active_shops: Account.active.count,
      matched_rate_pct: total_events.positive? ? (matched_events * 100.0 / total_events).round(1) : nil,
      zalo_channels: Channel::ZaloPersonal.count,
      ai_ready: ENV['AGENTGW_API_KEY'].present? || ENV['OPENAI_API_KEY'].present?,
      mailhog_enabled: Kchat::MailhogClient.enabled?
    }
  end
end
