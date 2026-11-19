import { computed, reactive, watch } from 'vue';
import { useShopAdmin } from './useShopAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import subscriptionAPI from 'dashboard/api/kchat/subscription';

// Trial banner state (guided UX spec §3.4). The subscription API always returns
// status/days_left, even when the platform bank account is not configured.
export const URGENT_DAYS = 3;

const cache = reactive({});

export const resetKaloTrialCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
};

const load = async accountId => {
  cache[accountId] = { status: 'loading', data: null };
  try {
    const { data } = await subscriptionAPI.get();
    cache[accountId] = { status: 'ready', data };
  } catch {
    cache[accountId] = { status: 'error', data: null };
  }
};

export function useKaloTrial() {
  const { isAdmin } = useShopAdmin();
  const { accountId, accountScopedRoute } = useAccount();

  watch(
    [accountId, isAdmin],
    () => {
      if (isAdmin.value && accountId.value && !cache[accountId.value]) {
        load(accountId.value);
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
