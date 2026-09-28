# frozen_string_literal: true

class ZaloPersonal::ConnectionStatusService
  def initialize(channel:)
    @channel = channel
  end

  def handle_session_event(event_type:, event_payload:)
    case event_type
    when 'session.connected'
      @channel.mark_connected!
    when 'session.disconnected'
      @channel.mark_reconnecting!
    when 'session.expired'
      @channel.prompt_reauthorization!
    end
  end
end
