# frozen_string_literal: true

class ZaloPersonal::Connections::ReconnectService
  def initialize(inbox:, user:)
    @inbox = inbox
    @user = user
    @channel = inbox.channel
  end

  def perform
    ZaloPersonal::ConnectionAttempts::CreateService.new(
      account: @inbox.account,
      user: @user,
      target_inbox: @inbox,
      purpose: :reconnect
    ).perform
  end
end
