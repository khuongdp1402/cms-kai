import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';

// Mounts a settings list page with the Kalo frame, a small router and stubs
// for the global woot-* modals the pages register at app level.
export const mountSettingsPage = async (
  component,
  { getters = {}, actions = {}, routes = [], isAdmin = true } = {}
) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      'kalo_settings_hub',
      'kalo_console',
      'settings_page',
      ...routes,
    ].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}/:inboxId?/:teamId?`,
      component: { template: '<div />' },
    })),
  });
  const store = createStore({
    getters: {
      getCurrentRole: () => (isAdmin ? 'administrator' : 'agent'),
      getCurrentUserID: () => 1,
      'globalConfig/isACustomBrandedInstance': () => true,
      ...getters,
    },
    actions,
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  await router.push({ name: 'settings_page', params: { accountId: 1 } });
  const wrapper = mount(component, {
    global: {
      plugins: [router, store, i18n],
      directives: { tooltip: {} },
      stubs: {
        'woot-modal': { template: '<div><slot /></div>' },
        'woot-loading-state': true,
        'woot-delete-modal': {
          name: 'WootDeleteModal',
          props: ['show', 'title', 'message', 'confirmText', 'rejectText'],
          template: '<div data-test="delete-modal" />',
        },
        'woot-confirm-delete-modal': {
          name: 'WootConfirmDeleteModal',
          props: ['title', 'message', 'confirmText', 'rejectText'],
          template: '<div data-test="delete-modal" />',
        },
      },
    },
  });
  await flushPromises();
  return { wrapper, router, store };
};
