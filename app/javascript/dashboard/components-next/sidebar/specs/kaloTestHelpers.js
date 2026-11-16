import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

const names = [
  'home',
  'kalo_orders',
  'kalo_pos',
  'contacts_dashboard_index',
  'kalo_marketing',
  'kalo_reports',
  'kalo_settings_hub',
  'labels_list',
];

export const createKaloTestEnv = ({ unread = 0 } = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  const get = vi.fn();
  const store = createStore({
    getters: {
      'globalConfig/get': () => ({}),
      'accounts/getAccount': () => () => ({}),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => () => true,
      'conversationUnreadCounts/getAllUnreadCount': () => unread,
    },
    modules: {
      conversationUnreadCounts: {
        namespaced: true,
        actions: { get, clear: vi.fn() },
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return { router, store, i18n, fetchUnread: get };
};
