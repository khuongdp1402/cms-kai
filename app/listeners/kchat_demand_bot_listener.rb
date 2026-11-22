# frozen_string_literal: true

class KchatDemandBotListener < BaseListener
  def message_created(event)
    message = event.data[:message]
    return if message.nil? || !message.incoming? || message.private? || message.activity?
    return if message.account.blank?

    ::Kchat::DemandBotService.new(message.account).process_message!(message)
  end
end
