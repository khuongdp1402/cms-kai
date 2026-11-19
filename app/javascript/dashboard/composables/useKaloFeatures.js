import { computed } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';
import { requiredKaloFeatures } from 'dashboard/helper/kaloFeatures';

/**
 * Per-shop Kalo modules (kalo_* flags in the account `features` payload).
 * `isLoaded` is false until the account record is in the store, so callers
 * that would show a "not enabled" page can wait instead of flashing it.
 */
export function useKaloFeatures() {
  const accountId = useMapGetter('getCurrentAccountId');
  const getAccount = useMapGetter('accounts/getAccount');
  const isFeatureEnabledonAccount = useMapGetter(
    'accounts/isFeatureEnabledonAccount'
  );

  const isLoaded = computed(() =>
    Boolean(getAccount.value(accountId.value)?.features)
  );
  const isOn = flag =>
    Boolean(isFeatureEnabledonAccount.value(accountId.value, flag));
  const missingFeatures = route =>
    requiredKaloFeatures(route).filter(flag => !isOn(flag));
  const isRouteOn = route => missingFeatures(route).length === 0;
  // Route name only: for links built from a name.
  const isRouteNameOn = name => isRouteOn({ name });

  return { isLoaded, isOn, isRouteOn, isRouteNameOn, missingFeatures };
}
