# Renders the super admin in the installation locale (DEFAULT_LOCALE, Vietnamese by
# default for Kalo). Administrate controllers have no locale switching of their own.
module SuperAdmin::KaloLocale
  extend ActiveSupport::Concern

  included do
    around_action :switch_kalo_locale
  end

  private

  def switch_kalo_locale(&)
    locale = ENV.fetch('DEFAULT_LOCALE', 'vi').to_s
    locale = 'en' unless I18n.available_locales.map(&:to_s).include?(locale)
    I18n.with_locale(locale, &)
  end
end
