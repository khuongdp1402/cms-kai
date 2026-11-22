<script setup>
import { onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useShopAdmin } from './useShopAdmin';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import {
  KALO_TOURS,
  MOBILE_BREAKPOINT,
  findTour,
  hasBlockingOverlay,
  presentSteps,
  stepsForWidth,
} from './kaloTours';
import {
  activeTourKey,
  runTour,
  stopActiveTour,
  useKaloTourSeen,
} from './useKaloTour';

// Starts a module's tour on the first visit, and a tour asked for from
// "Hướng dẫn" through `?tour=<key>` (even if seen). Renders nothing; mounted
// once in the app shell.
const POLL_MS = 250;
const MAX_WAIT_MS = 4000;
const FETCHING_GETTERS = ['kchatProducts/getUIFlags', 'kchatOrders/getUIFlags'];
const ACTION_QUERY_KEYS = ['new', 'invite', 'add_product'];

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const store = useStore();
const { isAdmin } = useShopAdmin();
const { isLoaded, isOn } = useKaloFeatures();
const { isSeen, markSeen } = useKaloTourSeen();
const currentUser = useMapGetter('getCurrentUser');

const isPageFetching = () =>
  FETCHING_GETTERS.some(key => Boolean(store.getters[key]?.isFetching));
const hasActionQuery = () =>
  ACTION_QUERY_KEYS.some(key => Boolean(route.query?.[key]));

let timer = null;
const clearTimer = () => {
  clearTimeout(timer);
  timer = null;
};

const isAllowed = tour =>
  (!tour.flag || isOn(tour.flag)) && (!tour.adminOnly || isAdmin.value);

const tourForRoute = () => {
  const pending = route.query?.tour && findTour(route.query.tour);
  if (
    pending &&
    (route.name === pending.route || pending.matches(route)) &&
    isAllowed(pending)
  ) {
    return { tour: pending, forced: true };
  }
  const tour = KALO_TOURS.find(item => item.matches(route));
  if (!tour || !isAllowed(tour) || isSeen(tour.key)) return null;
  // Desktop-only tours wait for a wide screen instead of being marked seen.
  if (window.innerWidth < MOBILE_BREAKPOINT && !tour.mobileSteps.length) {
    return null;
  }
  return { tour, forced: false };
};

const dropTourQuery = () => {
  const { tour: _tour, ...query } = route.query;
  router.replace({ query });
};

const start = (tour, forced) => {
  const started = runTour(tour, { t, onClose: () => markSeen(tour.key) });
  if (forced) dropTourQuery();
  return started;
};

// Pages render parts after their data (the chat composer comes after the
// list) and links with ?new=1/?invite=1 open a KaloDrawer on arrival: hold the
// spotlight tour until drawers/modals close and initial fetches finish.
const startWhenReady = ({ tour, forced }, waited = 0) => {
  if (hasBlockingOverlay() || hasActionQuery()) {
    timer = setTimeout(() => startWhenReady({ tour, forced }, 0), POLL_MS);
    return;
  }
  const steps = stepsForWidth(tour, window.innerWidth);
  if (!isPageFetching() && presentSteps(steps).length === steps.length) {
    start(tour, forced);
    return;
  }
  if (waited >= MAX_WAIT_MS) {
    // Fall back to whatever part of the tour is on this page.
    if (presentSteps(steps).length) start(tour, forced);
    else if (forced) dropTourQuery();
    return;
  }
  timer = setTimeout(
    () => startWhenReady({ tour, forced }, waited + POLL_MS),
    POLL_MS
  );
};

const evaluate = () => {
  clearTimer();
  // A running tour keeps going while its page stays (e.g. switching chats).
  const active = activeTourKey.value && findTour(activeTourKey.value);
  if (active) {
    if (route.name === active.route || active.matches(route)) return;
    stopActiveTour();
  }
  if (!isLoaded.value || !currentUser.value?.id) return;
  const match = tourForRoute();
  if (match) startWhenReady(match);
};

watch(() => [route.fullPath, isLoaded.value, currentUser.value?.id], evaluate, {
  immediate: true,
});

onBeforeUnmount(() => {
  clearTimer();
  stopActiveTour();
});
</script>

<template>
  <span hidden data-test-id="kalo-tour-host" />
</template>
