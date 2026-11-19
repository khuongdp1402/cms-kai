import { computed, reactive, watch } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useShopAdmin } from './useShopAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import productsAPI from 'dashboard/api/kchat/products';
import ordersAPI from 'dashboard/api/kchat/orders';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';

// "Bắt đầu với Kalo" (guided UX spec §3.1): five steps, each marked done from
// real data. Skips and the hidden flag live in the user's uiSettings, per account.
export const SETUP_UI_KEY = 'kalo_setup';
export const SETUP_STEP_KEYS = [
  'CHANNEL',
  'PRODUCT',
  'PAYMENT',
  'ORDER',
  'INVITE',
];

// One fetch per account, shared by the card, the rail entry and the sheet row.
const cache = reactive({});

const blankEntry = () => ({
  status: 'idle',
  products: 0,
  orders: 0,
  hasPayment: false,
});

// In-flight loads per account: concurrent refreshes share one set of requests.
const inFlight = {};

export const resetKaloSetupCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
  Object.keys(inFlight).forEach(key => delete inFlight[key]);
};

const fetchEntry = async (accountId, store) => {
  if (!cache[accountId]) cache[accountId] = blankEntry();
  // Mutate through the reactive proxy so every user re-renders.
  const entry = cache[accountId];
  // A refresh keeps showing the last data (no flicker); only the first load is 'loading'.
  if (entry.status === 'idle') entry.status = 'loading';
  const attempt = fn => Promise.resolve().then(fn);
  const [products, orders, payment] = await Promise.allSettled([
    attempt(() => productsAPI.get()),
    attempt(() => ordersAPI.get({ page: 1 })),
    attempt(() => paymentSettingsAPI.get()),
    attempt(() => store.dispatch('agents/get')),
  ]);
  if (products.status === 'fulfilled') {
    entry.products = (products.value.data?.payload || []).length;
  }
  if (orders.status === 'fulfilled') {
    entry.orders = Number(orders.value.data?.meta?.count || 0);
  }
  if (payment.status === 'fulfilled') {
    const data = payment.value.data || {};
    entry.hasPayment = Boolean(data.bank_bin && data.account_number);
  }
  entry.status = 'ready';
};

const loadEntry = (accountId, store) => {
  if (!inFlight[accountId]) {
    inFlight[accountId] = fetchEntry(accountId, store).finally(() => {
      delete inFlight[accountId];
    });
  }
  return inFlight[accountId];
};

export function useKaloSetup() {
  const store = useStore();
  const { isAdmin } = useShopAdmin();
  const { accountId, accountScopedRoute } = useAccount();

  const entry = computed(() => cache[accountId.value] || blankEntry());
  const uiState = computed(
    () =>
      (store.getters.getUISettings?.[SETUP_UI_KEY] || {})[accountId.value] || {}
  );
  const skipped = computed(() => uiState.value.skipped || []);
  const isHidden = computed(() => Boolean(uiState.value.hidden));

  const inboxCount = computed(
    () => (store.getters['inboxes/getInboxes'] || []).length
  );
  const agentCount = computed(
    () => (store.getters['agents/getAgents'] || []).length
  );

  // The products page (under Đơn hàng) is available whether POS is on or off.
  const productRoute = computed(() =>
    accountScopedRoute('kalo_products', {}, { new: '1' })
  );

  const steps = computed(() => {
    const done = {
      CHANNEL: inboxCount.value > 0,
      PRODUCT: entry.value.products > 0,
      PAYMENT: entry.value.hasPayment,
      ORDER: entry.value.orders > 0,
      INVITE: agentCount.value > 1,
    };
    const routes = {
      CHANNEL: accountScopedRoute('settings_inbox_new'),
      PRODUCT: productRoute.value,
      PAYMENT: accountScopedRoute('kalo_payment_settings'),
      ORDER: accountScopedRoute('kalo_orders', {}, { new: '1' }),
      INVITE: accountScopedRoute('kalo_console', {}, { invite: '1' }),
    };
    return SETUP_STEP_KEYS.map(key => ({
      key,
      done: done[key],
      skipped: !done[key] && skipped.value.includes(key),
      to: routes[key],
    }));
  });

  const doneCount = computed(() => steps.value.filter(s => s.done).length);
  const remaining = computed(
    () => steps.value.filter(s => !s.done && !s.skipped).length
  );
  const isReady = computed(() => entry.value.status === 'ready');
  // Only shop admins can do these steps (channels, payment, staff).
  const isVisible = computed(
    () => isAdmin.value && isReady.value && !isHidden.value
  );
  const showBadge = computed(() => isVisible.value && remaining.value > 0);

  const saveState = patch => {
    const settings = store.getters.getUISettings || {};
    const all = settings[SETUP_UI_KEY] || {};
    store.dispatch('updateUISettings', {
      uiSettings: {
        ...settings,
        [SETUP_UI_KEY]: {
          ...all,
          [accountId.value]: { ...uiState.value, ...patch },
        },
      },
    });
  };

  const skip = key =>
    saveState({ skipped: [...new Set([...skipped.value, key])] });
  const unskip = key =>
    saveState({ skipped: skipped.value.filter(item => item !== key) });
  const hide = () => saveState({ hidden: true });
  const show = () => saveState({ hidden: false });

  const refresh = () => {
    if (!isAdmin.value || !accountId.value || isHidden.value) {
      return Promise.resolve();
    }
    return loadEntry(accountId.value, store);
  };

  // First user of the composable for an account triggers the load.
  watch(
    [accountId, isAdmin, isHidden],
    () => {
      if (
        isAdmin.value &&
        accountId.value &&
        !isHidden.value &&
        !cache[accountId.value]
      ) {
        refresh();
      }
    },
    { immediate: true }
  );

  return {
    steps,
    doneCount,
    remaining,
    total: SETUP_STEP_KEYS.length,
    isReady,
    isHidden,
    isVisible,
    showBadge,
    skip,
    unskip,
    hide,
    show,
    refresh,
  };
}
