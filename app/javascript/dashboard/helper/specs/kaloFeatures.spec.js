import {
  requiredKaloFeatures,
  isConsolePage,
  EXTRA_CHANNEL_KEYS,
} from '../kaloFeatures';

describe('requiredKaloFeatures', () => {
  it.each([
    ['kalo_pos', ['kalo_pos']],
    ['kalo_comments', ['kalo_comments']],
    ['kalo_brand', ['kalo_brand']],
    ['kalo_posts', ['kalo_auto_posting']],
    ['kalo_campaigns', ['kalo_campaigns']],
    ['campaigns_livechat_index', ['kalo_campaigns']],
    ['campaigns_sms_index', ['kalo_campaigns', 'kalo_extra_channels']],
    ['campaigns_whatsapp_index', ['kalo_campaigns', 'kalo_extra_channels']],
    ['automation_list', ['kalo_advanced_automation']],
    ['macros_edit', ['kalo_advanced_automation']],
    ['settings_integrations_webhook', ['kalo_advanced_automation']],
    ['settings_integrations_dashboard_apps', ['kalo_advanced_automation']],
    ['portals_articles_index', ['kalo_help_center']],
    ['agent_reports_show', ['kalo_detailed_reports']],
    ['csat_reports', ['kalo_detailed_reports']],
  ])('%s needs %j', (name, flags) => {
    expect(requiredKaloFeatures({ name })).toEqual(flags);
  });

  it.each([
    'kalo_overview',
    'home',
    'kalo_orders',
    'kalo_reports',
    'kalo_marketing',
    'kalo_console',
    'contacts_dashboard_index',
    'settings_applications',
    'settings_integrations_slack',
    'agent_list',
    'profile_settings_index',
  ])('%s needs no flag', name => {
    expect(requiredKaloFeatures({ name })).toEqual([]);
  });

  it('reads parent records too (nested settings routes)', () => {
    expect(
      requiredKaloFeatures({
        name: 'child',
        matched: [{ name: 'macros_wrapper' }, { name: 'child' }],
      })
    ).toEqual(['kalo_advanced_automation']);
  });

  it('gates the add-inbox sub page of an extra channel only', () => {
    EXTRA_CHANNEL_KEYS.forEach(sub_page =>
      expect(
        requiredKaloFeatures({
          name: 'settings_inboxes_page_channel',
          params: { sub_page },
        })
      ).toEqual(['kalo_extra_channels'])
    );
    ['zalo_personal', 'facebook', 'instagram', 'tiktok', 'website'].forEach(
      sub_page =>
        expect(
          requiredKaloFeatures({
            name: 'settings_inboxes_page_channel',
            params: { sub_page },
          })
        ).toEqual([])
    );
  });
});

describe('isConsolePage', () => {
  it.each([
    'general_settings_index',
    'agent_list',
    'settings_teams_list',
    'settings_teams_edit_members',
    'settings_inbox_list',
    'settings_inbox_show',
    'settings_inboxes_page_channel',
    'kalo_billing',
    'kalo_payment_settings',
  ])('%s belongs to the Console', name => {
    expect(isConsolePage(name)).toBe(true);
  });

  it.each(['labels_list', 'canned_list', 'automation_list', undefined])(
    '%s stays under the settings hub',
    name => {
      expect(isConsolePage(name)).toBe(false);
    }
  );
});
