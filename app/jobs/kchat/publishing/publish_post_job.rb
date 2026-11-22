# frozen_string_literal: true

# Publishes one approved post when it is due (ADR-031). Enqueued at approval with `wait_until: scheduled_at`
# and again by DuePostsJob every minute; `claim_for_publishing!` makes extra runs a no-op.
class Kchat::Publishing::PublishPostJob < ApplicationJob
  queue_as :default

  # Delay before attempt 2 and attempt 3 after a transient Graph error.
  RETRY_DELAYS = [2.minutes, 10.minutes].freeze

  def perform(post_id)
    post = Kchat::Post.find_by(id: post_id)
    return if post.nil? || !post.claim_for_publishing!

    return post.mark_failed!('feature_disabled') unless post.account.feature_enabled?('kalo_auto_posting')
    return post.mark_failed!('subscription_expired') if Kchat::Entitlements.status(post.account) == :expired

    post.mark_published!(**Kchat::Publishing::FacebookPublisher.new(post).publish!)
  rescue Kchat::Publishing::Error => e
    handle_publish_error(post, e)
  end

  private

  def handle_publish_error(post, error)
    if error.retryable && post.attempts < Kchat::Post::MAX_PUBLISH_ATTEMPTS
      retry_at = RETRY_DELAYS.fetch(post.attempts - 1, RETRY_DELAYS.last).from_now
      post.schedule_retry!(retry_at, error.code, error.message)
      self.class.set(wait_until: retry_at).perform_later(post.id)
    else
      post.mark_failed!(error.code, error.message)
    end
  end
end
