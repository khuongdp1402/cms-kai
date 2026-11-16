class Api::V1::Accounts::Kchat::PaymentSettingsController < Api::V1::Accounts::Kchat::BaseController
  before_action :check_admin_authorization?, only: :update

  def show
    render json: ::Kchat::PaymentSettings.for(Current.account)
  end

  def update
    render json: ::Kchat::PaymentSettings.update!(Current.account, params.permit(*::Kchat::PaymentSettings::FIELDS))
  end
end
