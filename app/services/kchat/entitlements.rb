# frozen_string_literal: true

# Subscription state of an account: 14 day trial from creation, then a paid plan until
# `custom_attributes['subscription_valid_until']`. Expired accounts keep read access and messaging.
module Kchat::Entitlements
  TRIAL_DAYS = 14

  class Expired < StandardError; end

  module_function

  def status(account)
    return :active if paid_until(account)&.future?
    return :trial if trial_ends_at(account).future?

    :expired
  end

  def require_active!(account)
    raise Expired if status(account) == :expired
  end

  def trial_ends_at(account)
    account.created_at + TRIAL_DAYS.days
  end

  # Same shape the SQL guard in Kchat::AccountScopes accepts: a full ISO 8601 timestamp with Z or an offset.
  # Date-only values ("2026-12-01") and partial parses ("5") are NOT valid; everything the app writes is `Time#iso8601`.
  ISO_TIMESTAMP = /\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/

  # nil for anything that is not a valid timestamp string (never raises).
  def parse_valid_until(value)
    return unless value.is_a?(String) && value.match?(ISO_TIMESTAMP)
    # Time.iso8601 rolls 2026-02-30 over to March 2 instead of failing, so check the calendar date itself.
    return unless Date.valid_date?(*value.first(10).split('-').map(&:to_i))

    Time.iso8601(value).in_time_zone
  rescue ArgumentError
    nil
  end

  # A hand-edited or corrupt value means no paid period; it must not break every page that lists accounts.
  def paid_until(account)
    value = account.custom_attributes&.dig('subscription_valid_until')
    return if value.blank?

    parsed = parse_valid_until(value)
    Rails.logger.warn "[Entitlements] account=#{account.id} has an invalid subscription_valid_until" if parsed.nil?
    parsed
  end

  # End of the current entitlement: the paid period when active, otherwise the trial end.
  def valid_until(account)
    status(account) == :active ? paid_until(account) : trial_ends_at(account)
  end

  def days_left(account)
    return 0 if status(account) == :expired

    ((valid_until(account) - Time.current) / 1.day).ceil
  end
end
