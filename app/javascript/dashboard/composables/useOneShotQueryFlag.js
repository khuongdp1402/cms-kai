import { inject } from 'vue';
import { routeLocationKey, routerKey } from 'vue-router';

// Reads a one-shot `?<name>=1` (setup checklist / "Tạo đơn" links open a form
// with it) and drops it from the URL, so a reload or a copied link does not
// open the form again. Router and route are optional (specs mount without).
export function useOneShotQueryFlag(name) {
  const route = inject(routeLocationKey, null);
  const router = inject(routerKey, null);
  const isSet = route?.query?.[name] === '1';
  if (isSet && router) {
    const query = { ...route.query };
    delete query[name];
    router.replace({ query });
  }
  return isSet;
}
