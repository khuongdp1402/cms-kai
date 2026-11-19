# frozen_string_literal: true

# Activity lines (assignment, team, status, priority, labels, mute, CSAT and
# auto-resolve notices) are written once and read by every agent of the shop.
# Auto assignment and other background jobs run in the default locale, so
# "Assigned to … by Default Policy" came out in English for a Vietnamese shop.
# Render them in the account's language.
module Kchat::ActivityLocale
  def self.with_account_locale(account, &)
    locale = account&.locale
    return yield if locale.blank? || I18n.available_locales.exclude?(locale.to_sym)

    I18n.with_locale(locale, &)
  end

  private

  def process_assignment_activities
    Kchat::ActivityLocale.with_account_locale(account) { super }
  end

  def create_activity
    Kchat::ActivityLocale.with_account_locale(account) { super }
  end

  def create_mute_change_activity(change_type)
    Kchat::ActivityLocale.with_account_locale(account) { super }
  end

  # CsatSurveyService: "CSAT survey not sent …" line.
  module CsatSurvey
    private

    def create_csat_not_sent_activity_message
      Kchat::ActivityLocale.with_account_locale(conversation.account) { super }
    end
  end

  # MessageTemplates::Template::AutoResolve: "Auto-resolve message not sent …" line.
  module AutoResolve
    private

    def create_auto_resolve_not_sent_activity_message
      Kchat::ActivityLocale.with_account_locale(conversation.account) { super }
    end
  end
end
