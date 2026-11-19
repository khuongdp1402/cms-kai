import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloContactsQuickBar from '../KaloContactsQuickBar.vue';

const mountBar = async ({
  routeName = 'contacts_dashboard_index',
  params = {},
  segments = [],
  labels = [],
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'contacts_dashboard_index',
        path: '/app/accounts/:accountId/contacts',
        component: { template: '<div />' },
      },
      {
        name: 'contacts_dashboard_active',
        path: '/app/accounts/:accountId/contacts/active',
        component: { template: '<div />' },
      },
      {
        name: 'contacts_dashboard_segments_index',
        path: '/app/accounts/:accountId/contacts/segments/:segmentId',
        component: { template: '<div />' },
      },
      {
        name: 'contacts_dashboard_labels_index',
        path: '/app/accounts/:accountId/contacts/labels/:label',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({
    name: routeName,
    params: { accountId: 1, ...params },
  });
  await router.isReady();

  const store = createStore({
    getters: {
      'accounts/getAccount': () => () => ({ id: 1, name: 'Shop' }),
      'accounts/isFeatureEnabledonAccount': () => () => true,
      'globalConfig/isOnChatwootCloud': () => false,
      'customViews/getContactCustomViews': () => segments,
      'labels/getLabels': () => labels,
    },
  });

  const wrapper = mount(KaloContactsQuickBar, {
    global: {
      plugins: [
        router,
        store,
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
  });

  return { wrapper, router };
};

describe('KaloContactsQuickBar', () => {
  it('renders All, Active, saved segments and navigates when a label is selected', async () => {
    const { wrapper, router } = await mountBar({
      segments: [
        { id: 10, name: 'Khách VIP' },
        { id: 11, name: 'Đã mua 2 lần' },
      ],
      labels: [
        { id: 1, title: 'vip' },
        { id: 2, title: 'ha-noi' },
      ],
    });

    expect(wrapper.find('[data-test="contacts-quick-all"]').text()).toBe(
      'Tất cả khách'
    );
    expect(wrapper.find('[data-test="contacts-quick-active"]').text()).toBe(
      'Đang hoạt động'
    );
    const segmentLinks = wrapper.findAll(
      '[data-test="contacts-quick-segment"]'
    );
    expect(segmentLinks).toHaveLength(2);
    expect(segmentLinks[0].text()).toBe('Khách VIP');
    expect(segmentLinks[0].attributes('href')).toContain('/segments/10');

    const labelSelect = wrapper.find('[data-test="contacts-quick-label"]');
    await labelSelect.setValue('vip');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe(
      'contacts_dashboard_labels_index'
    );
    expect(router.currentRoute.value.params.label).toBe('vip');

    await labelSelect.setValue('');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('contacts_dashboard_index');
  });
});
