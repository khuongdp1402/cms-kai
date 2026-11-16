import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

// Shared mount environment for the Kalo reports, marketing and billing specs.
export const createPageTestEnv = ({
  modules = {},
  role = 'administrator',
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      'kalo_orders',
      'kalo_billing',
      'campaigns_sms_index',
      'campaigns_whatsapp_index',
    ].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  const store = createStore({
    getters: { getCurrentAccountId: () => 1, getCurrentRole: () => role },
    modules,
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return { router, store, i18n, plugins: [router, store, i18n] };
};
