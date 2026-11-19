import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';

// Route names that keep a nav item highlighted.
const CONVERSATION_ROUTES =
  /conversation|^home$|^inbox_|^label_conversations$|^team_conversations$|^folder_conversations$/;

export const KALO_NAV_ITEMS = [
  {
    key: 'overview',
    icon: 'home',
    labelKey: 'KALO_NAV.OVERVIEW',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'kalo_overview',
    isActive: name => name === 'kalo_overview',
  },
  {
    key: 'messages',
    icon: 'msg',
    labelKey: 'KALO_NAV.MESSAGES',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'home',
    isActive: name => CONVERSATION_ROUTES.test(name),
  },
  {
    key: 'orders',
    icon: 'bag',
    labelKey: 'KALO_NAV.ORDERS',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'kalo_orders',
    isActive: name => ['kalo_orders', 'kalo_pos'].includes(name),
  },
  {
    key: 'customers',
    icon: 'users',
    labelKey: 'KALO_NAV.CUSTOMERS',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'contacts_dashboard_index',
    isActive: name => name.startsWith('contacts_'),
  },
  {
    key: 'marketing',
    icon: 'mega',
    labelKey: 'KALO_NAV.MARKETING',
    sectionKey: 'KALO_NAV.SECTIONS.GROWTH',
    route: 'kalo_marketing',
    isActive: name =>
      name === 'kalo_marketing' || name.startsWith('campaigns_'),
  },
  {
    key: 'reports',
    icon: 'chart',
    labelKey: 'KALO_NAV.REPORTS',
    sectionKey: 'KALO_NAV.SECTIONS.GROWTH',
    route: 'kalo_reports',
    isActive: name => name === 'kalo_reports',
  },
  {
    key: 'settings',
    icon: 'set',
    labelKey: 'KALO_NAV.SETTINGS',
    route: 'kalo_settings_hub',
    isActive: name => name === 'kalo_settings_hub',
  },
];

export function useKaloNav() {
  const route = useRoute();
  const store = useStore();
  const { accountId, accountScopedRoute } = useAccount();
  const isFeatureEnabledonAccount = useMapGetter(
    'accounts/isFeatureEnabledonAccount'
  );
  const unreadCount = useMapGetter(
    'conversationUnreadCounts/getAllUnreadCount'
  );

  const unreadEnabled = computed(() =>
    isFeatureEnabledonAccount.value(
      accountId.value,
      FEATURE_FLAGS.CONVERSATION_UNREAD_COUNTS
    )
  );

  store.dispatch('notifications/unReadCount');
  // The Chatwoot Sidebar (no longer rendered) loaded these account lists on mount; the chat
  // list, filters, bulk actions, channel badges and welcome screen read them from the store.
  store.dispatch('labels/get');
  store.dispatch('inboxes/get');
  store.dispatch('teams/get');
  store.dispatch('attributes/get');
  store.dispatch('customViews/get', 'conversation');
  store.dispatch('customViews/get', 'contact');

  watch(
    [accountId, unreadEnabled],
    ([currentAccountId, enabled]) => {
      if (!currentAccountId) return;
      store.dispatch(
        enabled
          ? 'conversationUnreadCounts/get'
          : 'conversationUnreadCounts/clear'
      );
    },
    { immediate: true }
  );

  const items = computed(() =>
    KALO_NAV_ITEMS.map(item => ({
      ...item,
      to: accountScopedRoute(item.route),
      active: item.isActive(String(route.name || '')),
      badge: item.key === 'messages' ? Number(unreadCount.value) || 0 : 0,
    }))
  );

  return { items };
}
