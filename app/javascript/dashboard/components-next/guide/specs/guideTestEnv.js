import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

export const GUIDE_ROUTES = [
  'kalo_overview',
  'home',
  'kalo_orders',
  'kalo_pos',
  'kalo_products',
  'kalo_console',
  'kalo_payment_settings',
  'kalo_billing',
  'kalo_comments',
  'kalo_brand',
  'settings_inbox_new',
];

// Store + router + i18n for the guide components. `features: null` turns every
// kalo_* flag on; `uiSettings` is real state so writes can be asserted.
export const createGuideEnv = ({
  role = 'administrator',
  features = null,
  inboxes = [],
  agents = [{ id: 1 }],
  uiSettings = {},
  productsFetching = { value: false },
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: GUIDE_ROUTES.map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  const updateUISettings = vi.fn(({ commit }, { uiSettings: next }) =>
    commit('setUISettings', next)
  );
  const store = createStore({
    state: { uiSettings: { ...uiSettings } },
    getters: {
      getCurrentRole: () => role,
      getCurrentAccountId: () => 1,
      getCurrentUser: () => ({ id: 7, name: 'Lan' }),
      getUISettings: state => state.uiSettings,
      'accounts/getAccount': () => id => ({ id, features: features || {} }),
      'accounts/isFeatureEnabledonAccount': () => (_id, name) =>
        features ? Boolean(features[name]) : true,
      'inboxes/getInboxes': () => inboxes,
      'agents/getAgents': () => agents,
      'kchatProducts/getUIFlags': () => ({
        isFetching: Boolean(productsFetching?.value),
      }),
    },
    mutations: {
      setUISettings(state, value) {
        state.uiSettings = value;
      },
    },
    actions: { updateUISettings, 'agents/get': vi.fn() },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return { router, store, i18n, updateUISettings };
};
