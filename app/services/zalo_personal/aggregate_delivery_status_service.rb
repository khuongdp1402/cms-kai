# frozen_string_literal: true

class ZaloPersonal::AggregateDeliveryStatusService
  def initialize(message:)
    @message = message
  end

  def aggregate
    mappings = @message.zalo_personal_message_mappings
    return 'sent' if mappings.empty?

    statuses = mappings.pluck(:status)
    if statuses.all? { |s| s == 'delivered' || s == 'read' }
      statuses.all? { |s| s == 'read' } ? 'read' : 'delivered'
    elsif statuses.any? { |s| s == 'failed' }
      'failed'
    else
      'sent'
    end
  end
end
