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
    key: 'messages',
    icon: 'msg',
    labelKey: 'KALO_NAV.MESSAGES',
    route: 'home',
    isActive: name => CONVERSATION_ROUTES.test(name),
  },
  {
    key: 'orders',
    icon: 'bag',
    labelKey: 'KALO_NAV.ORDERS',
    route: 'kalo_orders',
    isActive: name => ['kalo_orders', 'kalo_pos'].includes(name),
  },
  {
    key: 'customers',
    icon: 'users',
    labelKey: 'KALO_NAV.CUSTOMERS',
    route: 'contacts_dashboard_index',
    isActive: name => name.startsWith('contacts_'),
  },
  {
    key: 'marketing',
    icon: 'mega',
    labelKey: 'KALO_NAV.MARKETING',
    route: 'kalo_marketing',
    isActive: name =>
      name === 'kalo_marketing' || name.startsWith('campaigns_'),
  },
  {
    key: 'reports',
    icon: 'chart',
    labelKey: 'KALO_NAV.REPORTS',
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
