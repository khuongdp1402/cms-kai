# frozen_string_literal: true

class Webhooks::FacebookCommentEventsJob < ApplicationJob
  queue_as :default

  def perform(entry_json)
    entry = entry_json.is_a?(String) ? JSON.parse(entry_json) : entry_json
    Kchat::SocialComments::IngestService.from_facebook_entry(entry)
  end
end
