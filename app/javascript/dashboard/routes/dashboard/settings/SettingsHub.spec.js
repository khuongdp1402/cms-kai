import { mount } from '@vue/test-utils';
import SettingsHub from './SettingsHub.vue';
import { createKaloTestEnv } from 'dashboard/components-next/sidebar/specs/kaloTestHelpers';

describe('SettingsHub', () => {
  it('links to every Chatwoot area that left the navigation', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    await router.push({ name: 'kalo_settings_hub', params: { accountId: 1 } });
    const wrapper = mount(SettingsHub, {
      global: {
        plugins: [router, store, i18n],
        stubs: {
          RouterLink: {
            name: 'RouterLink',
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    });
    const targets = wrapper
      .findAllComponents({ name: 'RouterLink' })
      .map(link => link.props('to').name || link.props('to'));
    [
      'campaigns_livechat_index',
      'settings_inbox_list',
      'settings_applications',
      'labels_list',
      'settings_teams_list',
      'canned_list',
      'automation_list',
      'profile_settings_index',
      'kalo_payment_settings',
    ].forEach(name => expect(targets).toContain(name));
    expect(targets).not.toContain('account_overview_reports');
    expect(wrapper.find('h1').text()).toBe('Cài đặt');
  });
});
