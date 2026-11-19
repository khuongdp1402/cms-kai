# frozen_string_literal: true

class Api::V1::Console::MailInspectorController < Api::V1::Console::BaseController
  def index
    render json: client.list(query: params[:query])
  end

  def destroy
    if client.delete_message(params[:id])
      render json: { deleted: true }
    else
      render_error('delete_failed', :unprocessable_entity)
    end
  end

  def clear
    if client.clear_all
      render json: { cleared: true }
    else
      render_error('clear_failed', :unprocessable_entity)
    end
  end

  private

  def client
    @client ||= Kchat::MailhogClient.new
  end
end
