# frozen_string_literal: true

# Runs every minute (config/schedule.yml): fails posts whose publish run died midway, and enqueues every
# approved post that is due, so a post is still published when its scheduled job was lost (restart, deploy).
class Kchat::Publishing::DuePostsJob < ApplicationJob
  queue_as :scheduled_jobs

  BATCH_LIMIT = 500

  def perform
    Kchat::Post.stalled.find_each(&:mark_stalled!)
    Kchat::Post.due.order(:scheduled_at).limit(BATCH_LIMIT).pluck(:id).each do |post_id|
      Kchat::Publishing::PublishPostJob.perform_later(post_id)
    end
  end
end
