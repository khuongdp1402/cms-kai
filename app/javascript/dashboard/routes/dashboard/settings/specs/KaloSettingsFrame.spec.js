// Settings pages, multi-step settings flows and the notifications page sit in
// the KaloPage frame (guided UX spec §2): canvas, sticky KaloPageHeader band,
// body at the page width.
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import SettingsLayout from '../SettingsLayout.vue';
import SettingsWrapper from '../SettingsWrapper.vue';
import SettingsContent from '../Wrapper.vue';
import NotificationsView from '../../notifications/components/NotificationsView.vue';

vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));

const i18n = () =>
  createI18n({ legacy: false, locale: 'vi', messages: { vi: viMessages } });

const routerWith = async (parent, props = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/settings',
        component: parent,
        props: () => props,
        children: [
          {
            path: 'page',
            name: 'page',
            component: {
              components: { SettingsLayout },
              template:
                '<SettingsLayout><template #header><h1 data-test="title">Nhãn</h1></template><template #body><p data-test="body">Danh sách</p></template></SettingsLayout>',
            },
          },
        ],
      },
    ],
  });
  await router.push('/settings/page');
  return router;
};

describe('Settings frame', () => {
  it('renders the settings header slot inside the sticky KaloPageHeader band', async () => {
    const router = await routerWith(SettingsWrapper);
    const wrapper = mount(
      { template: '<router-view />' },
      { global: { plugins: [router, i18n()] } }
    );
    await flushPromises();
    const page = wrapper.find('[data-test-id="kalo-page"]');
    expect(page.classes()).toContain('bg-n-background');
    const header = page.find('[data-test-id="kalo-page-header"]');
    expect(header.classes()).toEqual(
      expect.arrayContaining(['sticky', 'top-0'])
    );
    expect(header.find('[data-test="title"]').text()).toBe('Nhãn');
    expect(
      page.find('[data-test-id="kalo-page-main"] [data-test="body"]').exists()
    ).toBe(true);
  });

  it('gives multi-step flows a KaloPageHeader with the title and back button', async () => {
    const router = await routerWith(SettingsContent, {
      headerTitle: 'KALO_SETTINGS_UI.PAGES.INBOXES.TITLE',
      showBackButton: true,
    });
    const wrapper = mount(
      { template: '<router-view />' },
      { global: { plugins: [router, i18n()] } }
    );
    await flushPromises();
    const headers = wrapper.findAll('[data-test-id="kalo-page-header"]');
    expect(headers[0].find('h1').text()).toBe(
      viMessages.KALO_SETTINGS_UI.PAGES.INBOXES.TITLE
    );
    expect(headers[0].find('button').exists()).toBe(true);
  });
});

describe('Notifications page', () => {
  const mountView = async meta => {
    const readAll = vi.fn();
    const store = createStore({
      getters: {
        getCurrentAccountId: () => 1,
        'notifications/getMeta': () => meta,
        'notifications/getNotifications': () => [],
        'notifications/getUIFlags': () => ({
          isFetching: false,
          isUpdating: false,
        }),
      },
      actions: {
        'notifications/get': vi.fn(),
        'notifications/readAll': readAll,
      },
    });
    const wrapper = mount(NotificationsView, {
      global: {
        plugins: [store, i18n()],
        mocks: { $route: { path: '/notifications' } },
      },
    });
    await flushPromises();
    return { wrapper, readAll };
  };

  it('has a KaloPage header with title, description and "mark all done" on the right', async () => {
    const { wrapper, readAll } = await mountView({
      unreadCount: 2,
      count: 2,
      currentPage: 1,
    });
    const header = wrapper.find('[data-test-id="kalo-page-header"]');
    expect(header.find('h1').text()).not.toBe('');
    expect(header.find('[data-test-id="kalo-page-description"]').text()).toBe(
      viMessages.KALO_SHELL2.NOTIFICATIONS.DESC
    );
    const markAll = header.find('[data-test="notifications-mark-all-done"]');
    await markAll.trigger('click');
    expect(readAll).toHaveBeenCalled();
    // One page: no empty pagination strip.
    expect(wrapper.find('[data-test-id="kalo-card"]').text()).not.toMatch(
      /\d+ - \d+/
    );
  });

  it('hides "mark all done" when everything is read', async () => {
    const { wrapper } = await mountView({
      unreadCount: 0,
      count: 0,
      currentPage: 1,
    });
    expect(
      wrapper.find('[data-test="notifications-mark-all-done"]').exists()
    ).toBe(false);
  });
});
