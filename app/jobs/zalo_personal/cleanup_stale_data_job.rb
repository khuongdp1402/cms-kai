# frozen_string_literal: true

class ZaloPersonal::CleanupStaleDataJob < ApplicationJob
  queue_as :housekeeping

  def perform
    # 1. Clean up old processed webhook events (> 14 days)
    ZaloPersonal::WebhookEvent.where(status: :processed).where('created_at < ?', 14.days.ago).delete_all

    # 2. Clean up expired / cancelled connection attempts (> 7 days)
    ZaloPersonal::ConnectionAttempt.where(status: [:expired, :cancelled, :failed]).where('created_at < ?', 7.days.ago).delete_all
  end
end
