# frozen_string_literal: true

class ZaloPersonal::ProcessWebhookEventJob < ApplicationJob
  queue_as :default

  def perform(webhook_event_id)
    event = ZaloPersonal::WebhookEvent.find_by(id: webhook_event_id)
    return unless event && event.pending?

    channel = event.channel
    payload = JSON.parse(event.payload)

    ZaloPersonal::EventDispatcher.new(channel: channel).dispatch(event_payload: payload)

    event.update!(
      status: :processed,
      processed_at: Time.current
    )
  rescue StandardError => e
    event&.update!(
      status: :failed,
      error_code: e.message
    )
    raise e
  end
end
