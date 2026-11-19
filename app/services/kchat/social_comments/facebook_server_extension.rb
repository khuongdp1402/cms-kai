# frozen_string_literal: true

module Kchat::SocialComments::FacebookServerExtension
  def trigger(events)
    super
    Array(events['entry']).each do |entry|
      changes = Array(entry['changes'])
      has_comment = changes.any? do |change|
        change['field'].to_s == 'feed' && change.dig('value', 'item').to_s == 'comment'
      end
      Webhooks::FacebookCommentEventsJob.perform_later(entry.to_json) if has_comment
    end
  end
end
