class Api::V1::Accounts::Kchat::PaymentSettingsController < Api::V1::Accounts::Kchat::BaseController
  # The preview is a real, scannable VietQR: a bank app shows the account holder's name before paying, so a shop can check its entry.
  PREVIEW_AMOUNT = 10_000
  PREVIEW_MEMO = 'KALO THU QR'.freeze

  before_action :check_admin_authorization?, only: [:update, :preview_qr]

  def show
    render json: ::Kchat::PaymentSettings.for(Current.account)
  end

  def update
    render json: ::Kchat::PaymentSettings.update!(Current.account, params.permit(*::Kchat::PaymentSettings::FIELDS))
  end

  def preview_qr
    settings = ::Kchat::PaymentSettings.qr_preview!(params.permit(*::Kchat::PaymentSettings::QR_FIELDS))
    payload = ::Kchat::VietQr.payload(bin: settings.bank_bin, account_number: settings.account_number, amount: PREVIEW_AMOUNT, memo: PREVIEW_MEMO)
    send_data ::Kchat::VietQr.png(payload), type: 'image/png', disposition: 'inline'
  end
end
