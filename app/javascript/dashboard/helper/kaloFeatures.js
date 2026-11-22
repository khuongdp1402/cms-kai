import { FEATURE_FLAGS } from 'dashboard/featureFlags';

// Kalo per-shop modules (guided UX spec §4, §7; ADR-023). A flag that is off
// hides the entry points; opening a hidden route shows KaloFeatureOff.
const {
  KALO_COMMENTS,
  KALO_CAMPAIGNS,
  KALO_BRAND,
  KALO_POS,
  KALO_ADVANCED_AUTOMATION,
  KALO_HELP_CENTER,
  KALO_DETAILED_REPORTS,
  KALO_EXTRA_CHANNELS,
  KALO_AUTO_POSTING,
} = FEATURE_FLAGS;

const ROUTES_BY_FEATURE = {
  [KALO_POS]: ['kalo_pos'],
  [KALO_COMMENTS]: ['kalo_comments'],
  [KALO_BRAND]: ['kalo_brand'],
  [KALO_AUTO_POSTING]: ['kalo_posts'],
  [KALO_CAMPAIGNS]: [
    'kalo_campaigns',
    'campaigns_ongoing_index',
    'campaigns_livechat_index',
    'campaigns_one_off_index',
    'campaigns_sms_index',
    'campaigns_whatsapp_index',
  ],
  [KALO_EXTRA_CHANNELS]: ['campaigns_sms_index', 'campaigns_whatsapp_index'],
  [KALO_ADVANCED_AUTOMATION]: [
    'automation_list',
    'macros_wrapper',
    'macros_new',
    'macros_edit',
    'attributes_list',
    'agent_bots',
    'settings_integrations_webhook',
    'settings_integrations_dashboard_apps',
    'conversation_workflow_index',
  ],
  [KALO_HELP_CENTER]: [
    'portals_index',
    'portals_new',
    'portals_articles_index',
    'portals_articles_new',
    'portals_articles_edit',
    'portals_categories_index',
    'portals_categories_articles_index',
    'portals_categories_articles_new',
    'portals_categories_articles_edit',
    'portals_locales_index',
    'portals_settings_index',
  ],
  [KALO_DETAILED_REPORTS]: [
    'account_overview_reports',
    'conversation_reports',
    'agent_reports',
    'agent_reports_index',
    'agent_reports_show',
    'inbox_reports',
    'inbox_reports_index',
    'inbox_reports_show',
    'label_reports',
    'label_reports_index',
    'label_reports_show',
    'team_reports',
    'team_reports_index',
    'team_reports_show',
    'csat_reports',
    'sla_reports',
    'bot_reports',
  ],
};

// Channel picker keys (ChannelList.vue) behind kalo_extra_channels. `zalo` is
// the Zalo OA token channel; Zalo cá nhân, Facebook, Instagram, TikTok and the
// website widget stay visible.
export const EXTRA_CHANNEL_KEYS = [
  'whatsapp',
  'telegram',
  'line',
  'email',
  'sms',
  'api',
  'zalo',
];

// Integrations page cards behind kalo_advanced_automation.
export const ADVANCED_INTEGRATION_IDS = ['webhook', 'dashboard_apps'];

/**
 * Flags a route needs, from every matched record name plus the channel
 * sub-page of the add-inbox flow.
 * @param {{name?: string, matched?: Array<{name?: string}>, params?: object}} route
 * @returns {string[]}
 */
export const requiredKaloFeatures = route => {
  const names = new Set(
    [route?.name, ...(route?.matched || []).map(record => record.name)]
      .filter(Boolean)
      .map(String)
  );
  const flags = Object.entries(ROUTES_BY_FEATURE)
    .filter(([, routeNames]) => routeNames.some(name => names.has(name)))
    .map(([flag]) => flag);
  if (
    names.has('settings_inboxes_page_channel') &&
    EXTRA_CHANNEL_KEYS.includes(route?.params?.sub_page)
  ) {
    flags.push(KALO_EXTRA_CHANNELS);
  }
  return flags;
};

// Settings pages that now belong to the shop Console (spec §7): their back
// link returns to the Console instead of the settings hub.
const CONSOLE_PAGES =
  /^(general_settings|agent_list|settings_teams|settings_team_|settings_inbox|settings_inboxes|kalo_billing$|kalo_payment_settings$)/;

export const isConsolePage = routeName => CONSOLE_PAGES.test(routeName || '');
