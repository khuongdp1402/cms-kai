class Api::V1::Accounts::Kchat::SubscriptionsController < Api::V1::Accounts::Kchat::BaseController
  BANK_ENV = { bank: 'CASSO_BANK_NAME', account_number: 'CASSO_ACCOUNT_NUMBER', account_name: 'CASSO_ACCOUNT_NAME' }.freeze

  def show
    missing = BANK_ENV.values.select { |key| ENV[key].blank? }
    return render_billing_not_configured(missing) if missing.any?

    account = Current.account
    render json: {
      plan: account.custom_attributes['subscription_plan'],
      status: ::Kchat::Entitlements.status(account),
      valid_until: ::Kchat::Entitlements.valid_until(account).iso8601,
      days_left: ::Kchat::Entitlements.days_left(account),
      bank: BANK_ENV.transform_values { |key| ENV.fetch(key) },
      memo: "KALO #{account.id} PLAN",
      prices: Casso::WebhookHandler::PLAN_PRICES.sort_by { |_plan, price| price }.to_h
    }
  end

  private

  # Misconfiguration still fails (logged, 503), but as JSON the billing page can explain.
  def render_billing_not_configured(missing)
    Rails.logger.error("[kchat] billing not configured, missing #{missing.join(', ')}")
    render_kchat_error('billing_not_configured', :service_unavailable)
  end
end
