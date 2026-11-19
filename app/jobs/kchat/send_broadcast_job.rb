# frozen_string_literal: true

class Kchat::SendBroadcastJob < ApplicationJob
  queue_as :default

  def perform(account_id, broadcast_id)
    account = Account.find_by(id: account_id)
    return if account.nil?

    Kchat::BroadcastsService.new(account).execute_broadcast!(broadcast_id)
  end
end
