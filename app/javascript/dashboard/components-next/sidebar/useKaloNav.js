import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { getUserRole } from 'dashboard/helper/permissionsHelper';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { isConsolePage } from 'dashboard/helper/kaloFeatures';

// Route names that keep a nav item highlighted.
const CONVERSATION_ROUTES =
  /conversation|^home$|^inbox_|^label_conversations$|^team_conversations$|^folder_conversations$/;

// Shop sidebar per guided UX spec §4. `feature` hides an item when its kalo_*
// flag is off; `adminOnly` items are for shop administrators; `footer` items
// sit at the bottom of the rail.
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
    // Inboxes, labels, teams and saved folders (KaloMessageFilters).
    hasSubmenu: true,
    isActive: name => CONVERSATION_ROUTES.test(name),
  },
  {
    key: 'comments',
    icon: 'quote',
    labelKey: 'KALO_CONSOLE_SHOP.NAV.COMMENTS',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'kalo_comments',
    feature: FEATURE_FLAGS.KALO_COMMENTS,
    isActive: name => name === 'kalo_comments',
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
    key: 'orders',
    icon: 'bag',
    labelKey: 'KALO_NAV.ORDERS',
    sectionKey: 'KALO_NAV.SECTIONS.OPERATIONS',
    route: 'kalo_orders',
    isActive: name =>
      ['kalo_orders', 'kalo_pos', 'kalo_products'].includes(name),
  },
  {
    key: 'campaigns',
    icon: 'mega',
    labelKey: 'KALO_CONSOLE_SHOP.NAV.CAMPAIGNS',
    sectionKey: 'KALO_NAV.SECTIONS.GROWTH',
    route: 'kalo_campaigns',
    feature: FEATURE_FLAGS.KALO_CAMPAIGNS,
    // kalo_marketing is the former all-in-one page, kept for bookmarks.
    isActive: name =>
      ['kalo_campaigns', 'kalo_marketing'].includes(name) ||
      name.startsWith('campaigns_'),
  },
  {
    key: 'brand',
    icon: 'pen',
    labelKey: 'KALO_CONSOLE_SHOP.NAV.BRAND',
    sectionKey: 'KALO_NAV.SECTIONS.GROWTH',
    route: 'kalo_brand',
    feature: FEATURE_FLAGS.KALO_BRAND,
    isActive: name => name === 'kalo_brand',
  },
  {
    key: 'posts',
    icon: 'send',
    labelKey: 'KALO_PUBLISHING.NAV',
    sectionKey: 'KALO_NAV.SECTIONS.GROWTH',
    route: 'kalo_posts',
    feature: FEATURE_FLAGS.KALO_AUTO_POSTING,
    isActive: name => name === 'kalo_posts',
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
    key: 'console',
    icon: 'store',
    labelKey: 'KALO_CONSOLE_SHOP.NAV.CONSOLE',
    route: 'kalo_console',
    adminOnly: true,
    footer: true,
    isActive: name => name === 'kalo_console' || isConsolePage(name),
  },
  {
    key: 'settings',
    icon: 'set',
    labelKey: 'KALO_NAV.SETTINGS',
    route: 'kalo_settings_hub',
    footer: true,
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

  const { isOn } = useKaloFeatures();
  const currentUser = useMapGetter('getCurrentUser');
  const isAdmin = computed(
    () => getUserRole(currentUser.value, accountId.value) === 'administrator'
  );

  const items = computed(() =>
    KALO_NAV_ITEMS.filter(
      item =>
        (!item.feature || isOn(item.feature)) &&
        (!item.adminOnly || isAdmin.value)
    ).map(item => ({
      ...item,
      to: accountScopedRoute(item.route),
      active: item.isActive(String(route.name || '')),
      badge: item.key === 'messages' ? Number(unreadCount.value) || 0 : 0,
    }))
  );

  return { items };
}
