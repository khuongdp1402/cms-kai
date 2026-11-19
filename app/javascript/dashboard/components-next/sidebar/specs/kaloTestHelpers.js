import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

const names = [
  'kalo_overview',
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
  'inbox_dashboard',
  'label_conversations',
  'team_conversations',
  'folder_conversations',
  'portals_index',
];

const extraParams = {
  inbox_dashboard: '/:inbox_id',
  label_conversations: '/:label',
  team_conversations: '/:teamId',
  folder_conversations: '/:id',
  portals_index: '/:navigationPath',
};

export const createKaloTestEnv = ({
  unread = 0,
  accounts = [{ id: 1, name: 'Shop', role: 'administrator' }],
  notificationUnread = 0,
  createNewAccount = false,
  inboxes = [],
  labels = [],
  teams = [],
  folders = [],
  // When given, the store has the real uiSettings getter/action pair.
  uiSettings,
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}${extraParams[name] || ''}`,
      component: { template: '<div />' },
    })),
  });
  const get = vi.fn();
  const store = createStore({
    getters: {
      'globalConfig/get': () => ({
        createNewAccountFromDashboard: createNewAccount,
      }),
      'inboxes/getInboxes': () => inboxes,
      'labels/getLabelsOnSidebar': () => labels,
      'teams/getMyTeams': () => teams,
      'customViews/getConversationCustomViews': () => folders,
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
      ...(uiSettings ? { getUISettings: state => state.uiSettings } : {}),
    },
    ...(uiSettings
      ? {
          state: { uiSettings: { ...uiSettings } },
          mutations: {
            setUISettings(state, value) {
              state.uiSettings = value;
            },
          },
          actions: {
            updateUISettings: vi.fn(({ commit }, { uiSettings: next }) =>
              commit('setUISettings', next)
            ),
          },
        }
      : {}),
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
