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
  'search',
  'notifications_index',
  'profile_settings_index',
  'campaigns_livechat_index',
];

export const createKaloTestEnv = ({
  unread = 0,
  accounts = [{ id: 1, name: 'Shop', role: 'administrator' }],
  notificationUnread = 0,
} = {}) => {
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
      'globalConfig/isACustomBrandedInstance': () => false,
      getUserAccounts: () => accounts,
      getCurrentUser: () => ({
        available_name: 'Lan',
        email: 'lan@example.com',
        accounts,
      }),
      getCurrentUserAvailability: () => 'online',
      getCurrentAccountId: () => 1,
      getCurrentUserAutoOffline: () => false,
      'notifications/getMeta': () => ({ unreadCount: notificationUnread }),
      'accounts/getAccount': () => () => ({}),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => () => true,
      'conversationUnreadCounts/getAllUnreadCount': () => unread,
    },
    modules: {
      notifications: {
        namespaced: true,
        actions: { unReadCount: vi.fn() },
      },
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
