# frozen_string_literal: true

class ZaloPersonal::EventDispatcher
  def initialize(channel:)
    @channel = channel
  end

  def dispatch(event_payload:)
    event_type = event_payload['type']

    case event_type
    when 'message.created'
      ZaloPersonal::IncomingMessageService.new(channel: @channel).perform(event_payload: event_payload)
    when 'message.edited'
      ZaloPersonal::MessageLifecycleService.new(channel: @channel).edit(event_payload: event_payload)
    when 'message.recalled'
      ZaloPersonal::MessageLifecycleService.new(channel: @channel).recall(event_payload: event_payload)
    when 'message.delivered'
      ZaloPersonal::MessageStatusService.new(channel: @channel).update_status(event_payload: event_payload, status: :delivered)
    when 'message.read'
      ZaloPersonal::MessageStatusService.new(channel: @channel).update_status(event_payload: event_payload, status: :read)
    when 'message.failed'
      ZaloPersonal::MessageStatusService.new(channel: @channel).update_status(event_payload: event_payload, status: :failed)
    when 'reaction.added'
      ZaloPersonal::ReactionService.new(channel: @channel).add_reaction(event_payload: event_payload)
    when 'reaction.removed'
      ZaloPersonal::ReactionService.new(channel: @channel).remove_reaction(event_payload: event_payload)
    when 'typing.started'
      ZaloPersonal::TypingService.new(channel: @channel).toggle(event_payload: event_payload, typing_status: :started)
    when 'typing.stopped'
      ZaloPersonal::TypingService.new(channel: @channel).toggle(event_payload: event_payload, typing_status: :stopped)
    when 'session.connected', 'session.disconnected', 'session.expired'
      ZaloPersonal::ConnectionStatusService.new(channel: @channel).handle_session_event(
        event_type: event_type,
        event_payload: event_payload
      )
    end
  end
end
