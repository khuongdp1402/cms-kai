# frozen_string_literal: true

# SQL fragments over the subscription fields kept in `accounts.custom_attributes`.
module Kchat::AccountScopes
  VALID_UNTIL = "(accounts.custom_attributes->>'subscription_valid_until')::timestamptz"
  EXPIRING_SQL = "#{VALID_UNTIL} > :now AND #{VALID_UNTIL} <= :soon".freeze
  # no paid period running and still inside the trial window
  TRIAL_SQL = "(#{VALID_UNTIL} IS NULL OR #{VALID_UNTIL} <= :now) AND accounts.created_at > :trial_start".freeze
end
