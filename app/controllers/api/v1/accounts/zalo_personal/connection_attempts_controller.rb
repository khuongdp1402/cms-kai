# frozen_string_literal: true

class Api::V1::Accounts::ZaloPersonal::ConnectionAttemptsController < Api::V1::Accounts::BaseController
  before_action :set_attempt, only: [:show, :refresh_qr, :consume, :destroy]
  before_action :check_authorization

  def show
    res = ZaloPersonal::ConnectionAttempts::ShowService.new(attempt: @attempt).perform

    if res[:success]
      attempt = res[:attempt]
      render json: {
        public_id: attempt.public_id,
        status: attempt.status,
        qr_data_url: res[:qr_data_url],
        expires_at: attempt.expires_at,
        authenticated_at: attempt.authenticated_at,
        profile: attempt.profile,
        target_inbox_id: attempt.target_inbox_id,
        error_code: attempt.error_code
      }
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  def create
    target_inbox = Current.account.inboxes.find_by(id: params[:target_inbox_id])
    purpose = params[:purpose] == 'reconnect' ? :reconnect : :create_channel

    res = ZaloPersonal::ConnectionAttempts::CreateService.new(
      account: Current.account,
      user: Current.user,
      target_inbox: target_inbox,
      purpose: purpose
    ).perform

    if res[:success]
      render json: {
        public_id: res[:attempt].public_id,
        status: res[:attempt].status,
        qr_data_url: res[:qr_data_url],
        expires_at: res[:expires_at],
        error_code: res[:attempt].error_code
      }, status: :created
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  def refresh_qr
    res = ZaloPersonal::ConnectionAttempts::RefreshQrService.new(attempt: @attempt).perform

    if res[:success]
      render json: {
        public_id: @attempt.public_id,
        status: @attempt.status,
        qr_data_url: res[:qr_data_url],
        expires_at: res[:expires_at],
        error_code: @attempt.error_code
      }
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  def consume
    inbox_name = params[:inbox_name]
    res = ZaloPersonal::ConnectionAttempts::ConsumeService.new(
      attempt: @attempt,
      inbox_name: inbox_name
    ).perform

    if res[:success]
      render json: {
        success: true,
        inbox_id: res[:inbox].id,
        inbox_name: res[:inbox].name,
        channel_id: res[:channel].id
      }
    else
      render json: { error: res[:error] }, status: :unprocessable_entity
    end
  end

  def destroy
    ZaloPersonal::ConnectionAttempts::CancelService.new(attempt: @attempt).perform
    head :ok
  end

  private

  def set_attempt
    @attempt = Current.account.zalo_personal_connection_attempts.find_by!(public_id: params[:public_id] || params[:id])
  end

  def check_authorization
    authorize(:inbox, :create?)
  end
end
