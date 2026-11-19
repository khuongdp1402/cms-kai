import { computed } from 'vue';
import { useStore } from 'dashboard/composables/store';

// Like useAdmin, but tolerates stores without the role getter (nav specs
// mount these components with partial stores): no role means not an admin.
export function useShopAdmin() {
  const store = useStore();
  const isAdmin = computed(
    () => store.getters.getCurrentRole === 'administrator'
  );
  return { isAdmin };
}
