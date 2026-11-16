class Api::V1::Accounts::Kchat::SubscriptionsController < Api::V1::Accounts::Kchat::BaseController
  def show
    account = Current.account
    render json: {
      plan: account.custom_attributes['subscription_plan'],
      status: ::Kchat::Entitlements.status(account),
      valid_until: ::Kchat::Entitlements.valid_until(account).iso8601,
      days_left: ::Kchat::Entitlements.days_left(account),
      bank: { bank: ENV.fetch('CASSO_BANK_NAME'), account_number: ENV.fetch('CASSO_ACCOUNT_NUMBER'), account_name: ENV.fetch('CASSO_ACCOUNT_NAME') },
      memo: "KALO #{account.id} PLAN",
      prices: Casso::WebhookHandler::PLAN_PRICES.sort_by { |_plan, price| price }.to_h
    }
  end
end
