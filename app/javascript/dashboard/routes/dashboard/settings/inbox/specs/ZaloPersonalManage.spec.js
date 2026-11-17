import { shallowMount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import Settings from '../Settings.vue';

const ZALO_INBOX = {
  id: 9,
  name: 'Zalo shop',
  channel_type: INBOX_TYPES.ZALO_PERSONAL,
  connection_status: 'connected',
  zalo_user_id: '123',
};

describe('Inbox settings: Zalo personal summary banner', () => {
  it('"Xem hồ sơ và đăng xuất" switches to the configuration tab', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          name: 'settings_inbox_show',
          path: '/app/accounts/:accountId/settings/inboxes/:inboxId/:tab?',
          component: { template: '<div />' },
        },
      ],
    });
    await router.push({
      name: 'settings_inbox_show',
      params: { accountId: 1, inboxId: 9 },
    });
    const store = createStore({
      getters: {
        getCurrentAccountId: () => 1,
        'accounts/isFeatureEnabledonAccount': () => () => false,
        'globalConfig/isOnChatwootCloud': () => false,
        'inboxes/getUIFlags': () => ({ isFetching: false }),
        'portals/allPortals': () => [],
        'inboxes/getInbox': () => () => ZALO_INBOX,
        'inboxes/getInstagramInboxByInstagramId': () => () => null,
      },
      actions: { 'agents/get': vi.fn(), 'portals/index': vi.fn() },
    });
    const i18n = createI18n({
      legacy: false,
      locale: 'vi',
      messages: { vi: viMessages },
    });
    const replaceState = vi.spyOn(window.history, 'replaceState');

    const wrapper = shallowMount(Settings, {
      global: {
        plugins: [router, store, i18n],
        directives: { tooltip: {} },
        stubs: { SettingIntroBanner: { template: '<div><slot /></div>' } },
      },
    });
    await flushPromises();

    const button = wrapper.find('[data-test="zalo-personal-manage"]');
    expect(button.exists()).toBe(true);
    await button.trigger('click');

    const tabKeys = wrapper.vm.tabs.map(tab => tab.key);
    expect(wrapper.vm.selectedTabIndex).toBe(tabKeys.indexOf('configuration'));
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/accounts/1/settings/inboxes/9/configuration'
    );
  });
});
