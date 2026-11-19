import { computed, reactive, watch } from 'vue';
import { useShopAdmin } from './useShopAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import subscriptionAPI from 'dashboard/api/kchat/subscription';

// Trial banner state (guided UX spec §3.4). The subscription API always returns
// status/days_left, even when the platform bank account is not configured.
export const URGENT_DAYS = 3;
// Refetch on window focus at most this often (a Casso payment lands while the
// shop owner is in their bank app).
export const FOCUS_REFRESH_MS = 5 * 60 * 1000;

const cache = reactive({});
let focusListener = null;

const load = async accountId => {
  const previous = cache[accountId];
  // Keep showing the last state while refreshing.
  cache[accountId] = {
    status: previous?.data ? 'ready' : 'loading',
    data: previous?.data || null,
    at: Date.now(),
  };
  try {
    const { data } = await subscriptionAPI.get();
    cache[accountId] = { status: 'ready', data, at: Date.now() };
  } catch {
    cache[accountId] = {
      status: 'error',
      data: previous?.data || null,
      at: Date.now(),
    };
  }
};

/** Pages that already fetched the subscription (billing) share the result. */
export const setKaloTrialSubscription = (accountId, data) => {
  cache[accountId] = { status: 'ready', data, at: Date.now() };
};

/** After a payment is matched or a plan is changed for `accountId`. */
export const refreshKaloTrial = accountId => {
  if (cache[accountId]) return load(accountId);
  return Promise.resolve();
};

export const resetKaloTrialCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
  if (focusListener) window.removeEventListener('focus', focusListener);
  focusListener = null;
};

const listenForFocus = () => {
  if (focusListener) return;
  focusListener = () => {
    Object.keys(cache).forEach(accountId => {
      if (Date.now() - (cache[accountId].at || 0) >= FOCUS_REFRESH_MS) {
        load(accountId);
      }
    });
  };
  window.addEventListener('focus', focusListener);
};

export function useKaloTrial() {
  const { isAdmin } = useShopAdmin();
  const { accountId, accountScopedRoute } = useAccount();

  watch(
    [accountId, isAdmin],
    () => {
      if (isAdmin.value && accountId.value && !cache[accountId.value]) {
        load(accountId.value);
        listenForFocus();
      }
    },
    { immediate: true }
  );

  const subscription = computed(() => cache[accountId.value]?.data || null);
  const status = computed(() => subscription.value?.status || null);
  const daysLeft = computed(() => Number(subscription.value?.days_left || 0));
  // Paid shops see nothing; only admins can pay.
  const isVisible = computed(
    () => isAdmin.value && ['trial', 'expired'].includes(status.value)
  );
  const isExpired = computed(() => status.value === 'expired');
  const isUrgent = computed(
    () => isExpired.value || daysLeft.value <= URGENT_DAYS
  );
  const billingRoute = computed(() => accountScopedRoute('kalo_billing'));

  return {
    isVisible,
    isExpired,
    isUrgent,
    daysLeft,
    billingRoute,
  };
}
