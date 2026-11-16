# frozen_string_literal: true

class Api::V1::CassoController < ApplicationController
  skip_before_action :authenticate_user!, raise: false
  skip_before_action :set_current_user, raise: false
  skip_before_action :verify_authenticity_token, raise: false

  before_action :verify_secure_token!, only: :webhook
  before_action :ensure_development!, only: :simulate

  # POST /api/v1/casso/webhook
  def webhook
    render json: Casso::WebhookHandler.new(params).process, status: :ok
  end

  # GET /api/v1/casso/status — public: bank details customers transfer to.
  def status
    render json: {
      bank: ENV.fetch('CASSO_BANK_NAME'),
      account_number: ENV.fetch('CASSO_ACCOUNT_NUMBER'),
      account_name: ENV.fetch('CASSO_ACCOUNT_NAME'),
      syntax: 'KALO <ACCOUNT_ID> [PLAN|TOKEN|SEED] <ORDER_ID>'
    }, status: :ok
  end

  # POST /api/v1/casso/simulate — development only.
  def simulate
    tx = {
      'tid' => "SIM#{SecureRandom.hex(6)}",
      'description' => "KALO #{params.require(:account_ref)} #{params[:order_type]} #{params[:order_id] || rand(1000..9999)}".squish,
      'amount' => params.require(:amount).to_i,
      'when' => Time.current.iso8601
    }
    render json: Casso::WebhookHandler.new('data' => [tx]).process, status: :ok
  end

  private

  # Casso sends the token configured in its dashboard in the `Secure-Token` header.
  # A missing CASSO_SECURE_TOKEN is a misconfiguration: refuse every request instead of accepting anyone.
  def verify_secure_token!
    expected = ENV.fetch('CASSO_SECURE_TOKEN', '')
    raise 'CASSO_SECURE_TOKEN is not configured' if expected.blank?

    provided = request.headers['Secure-Token'].to_s
    return if ActiveSupport::SecurityUtils.secure_compare(provided, expected)

    render json: { error: 401, message: 'Invalid secure token' }, status: :unauthorized
  end

  def ensure_development!
    head :not_found unless Rails.env.development?
  end
end
