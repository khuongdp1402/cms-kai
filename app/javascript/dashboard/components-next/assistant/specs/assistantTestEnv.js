import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

export const createAssistantEnv = ({ flagOn = true, accountId = 1 } = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'kalo_billing',
        path: '/billing',
        component: { template: '<div />' },
      },
    ],
  });
  const store = createStore({
    getters: {
      getCurrentAccountId: () => accountId,
      'accounts/isFeatureEnabledonAccount': () => (_id, flag) =>
        flagOn && flag === 'kalo_ai_assistant',
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return { plugins: [router, store, i18n], router, store };
};

export const apiError = (status, error) => ({
  response: { status, data: { error } },
});
