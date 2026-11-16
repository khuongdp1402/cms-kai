# frozen_string_literal: true

# SQL fragments over the subscription fields kept in `accounts.custom_attributes`.
module Kchat::AccountScopes
  # `subscription_valid_until` can be edited by hand (super admin dashboard), so it is only cast to timestamptz after a strict
  # ISO 8601 check that also rules out impossible dates (a failing cast would 500 every list that uses these fragments).
  # Anything that does not match is treated as "no paid period" (NULL). Years 2000-2099, offsets up to +/-14:59.
  ISO_DATE = '(20[0-9]{2}-(0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01])' \
             '|20[0-9]{2}-(0[469]|11)-(0[1-9]|[12][0-9]|30)' \
             '|20[0-9]{2}-02-(0[1-9]|1[0-9]|2[0-8])' \
             '|20(0[048]|[2468][048]|[13579][26])-02-29)'
  ISO_TIMESTAMP = "^#{ISO_DATE}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]{1,6})?(Z|[+-](0[0-9]|1[0-4]):[0-5][0-9])$".freeze
  RAW_VALID_UNTIL = "accounts.custom_attributes->>'subscription_valid_until'"
  VALID_UNTIL = "(CASE WHEN #{RAW_VALID_UNTIL} ~ '#{ISO_TIMESTAMP}' THEN (#{RAW_VALID_UNTIL})::timestamptz END)".freeze
  EXPIRING_SQL = "#{VALID_UNTIL} > :now AND #{VALID_UNTIL} <= :soon".freeze
  # no paid period running and still inside the trial window
  TRIAL_SQL = "(#{VALID_UNTIL} IS NULL OR #{VALID_UNTIL} <= :now) AND accounts.created_at > :trial_start".freeze
end
