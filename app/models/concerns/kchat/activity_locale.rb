# frozen_string_literal: true

# Activity lines (assignment, team, status, priority, labels) are written once
# and read by every agent of the shop. Auto assignment and other background
# jobs run in the default locale, so "Assigned to … by Default Policy" came out
# in English for a Vietnamese shop. Render them in the account's language.
module Kchat::ActivityLocale
  private

  def process_assignment_activities
    with_account_locale { super }
  end

  def create_activity
    with_account_locale { super }
  end

  def with_account_locale(&)
    locale = account&.locale
    return yield if locale.blank? || I18n.available_locales.exclude?(locale.to_sym)

    I18n.with_locale(locale, &)
  end
end
