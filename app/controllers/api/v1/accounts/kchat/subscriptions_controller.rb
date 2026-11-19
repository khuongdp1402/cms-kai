class Api::V1::Accounts::Kchat::SubscriptionsController < Api::V1::Accounts::Kchat::BaseController
  BANK_ENV = { bank: 'CASSO_BANK_NAME', account_number: 'CASSO_ACCOUNT_NUMBER', account_name: 'CASSO_ACCOUNT_NAME' }.freeze

  # Trial/plan state is always returned (the trial banner needs it). The payment block (bank, memo,
  # prices) is only added when the Casso bank env is complete; otherwise `billing_configured: false`.
  def show
    account = Current.account
    render json: entitlement_payload(account).merge(payment_payload(account))
  end

  private

  def entitlement_payload(account)
    {
      plan: account.custom_attributes['subscription_plan'],
      status: ::Kchat::Entitlements.status(account),
      valid_until: ::Kchat::Entitlements.valid_until(account).iso8601,
      days_left: ::Kchat::Entitlements.days_left(account)
    }
  end

  # Misconfiguration is still logged loudly; only the payment block is left out.
  def payment_payload(account)
    missing = BANK_ENV.values.select { |key| ENV[key].blank? }
    if missing.any?
      Rails.logger.error("[kchat] billing not configured, missing #{missing.join(', ')}")
      return { billing_configured: false }
    end

    {
      billing_configured: true,
      bank: BANK_ENV.transform_values { |key| ENV.fetch(key) },
      memo: "KALO #{account.id} PLAN",
      prices: Casso::WebhookHandler::PLAN_PRICES.sort_by { |_plan, price| price }.to_h
    }
  end
end
