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

  def paid_until(account)
    value = account.custom_attributes&.dig('subscription_valid_until')
    Time.zone.parse(value) if value.present?
  rescue StandardError
    # A hand-edited, unparseable (or non-string, which raises TypeError) value means no paid period; it must not break every page that lists accounts.
    Rails.logger.warn "[Entitlements] account=#{account.id} has an unparseable subscription_valid_until"
    nil
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
