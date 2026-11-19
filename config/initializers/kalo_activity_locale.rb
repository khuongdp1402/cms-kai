# frozen_string_literal: true

# Activity lines created outside Conversation callbacks follow the account
# language too (Kchat::ActivityLocale). Prepended here so the upstream service
# files stay untouched.
Rails.application.config.to_prepare do
  CsatSurveyService.prepend(Kchat::ActivityLocale::CsatSurvey)
  MessageTemplates::Template::AutoResolve.prepend(Kchat::ActivityLocale::AutoResolve)
end
