# Presentation data for the Kalo super admin chrome (ADR-020).
# A plain module (not a view helper) because Administrate controllers do not
# include app helpers; views call it as `SuperAdmin::KaloNavigation.groups(self)`.
module SuperAdmin::KaloNavigation
  I18N_NS = 'kalo_super_admin.nav'.freeze

  def self.brand_name
    GlobalConfig.get_value('INSTALLATION_NAME').presence || 'Kalo'
  end

  # Only resources that have a working controller are listed.
  def self.groups(routes)
    definitions(routes).map do |key, items|
      {
        key: key,
        title: I18n.t("#{I18N_NS}.groups.#{key}"),
        items: items.map { |name, icon, url| { key: name, label: I18n.t("#{I18N_NS}.#{name}"), icon: icon, url: url } }
      }
    end
  end

  def self.definitions(routes)
    [
      [:overview, [[:dashboard, 'icon-grid-line', routes.super_admin_root_path]]],
      [:customers, [
        [:accounts, 'icon-building-4-line', routes.super_admin_accounts_path],
        [:users, 'icon-user-follow-line', routes.super_admin_users_path],
        [:agent_bots, 'icon-robot-line', routes.super_admin_agent_bots_path]
      ]],
      [:platform, platform_items(routes)],
      [:system, [
        [:installation_configs, 'icon-gear', routes.super_admin_installation_configs_path],
        [:instance_status, 'icon-health-book-line', routes.super_admin_instance_status_path],
        [:push_diagnostics, 'icon-mail-send-fill', routes.super_admin_push_diagnostics_path]
      ]]
    ]
  end

  def self.platform_items(routes)
    items = [[:platform_apps, 'icon-apps-2-line', routes.super_admin_platform_apps_path]]
    # The platform banners controller answers 404 outside Chatwoot cloud.
    items << [:platform_banners, 'icon-megaphone-line', routes.super_admin_platform_banners_path] if ChatwootApp.chatwoot_cloud?
    items << [:access_tokens, 'icon-lock-line', routes.super_admin_access_tokens_path]
  end
end
