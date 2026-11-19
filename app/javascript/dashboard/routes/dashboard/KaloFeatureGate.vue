<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { requiredKaloFeatures } from 'dashboard/helper/kaloFeatures';
import KaloFeatureOff from './KaloFeatureOff.vue';

// Wraps the account router-view: a page whose kalo_* flag is off shows
// KaloFeatureOff instead of its content (direct links and bookmarks).
const route = useRoute();
const { isLoaded, isRouteOn } = useKaloFeatures();

const needsFlags = computed(() => requiredKaloFeatures(route).length > 0);
// Wait for the account payload before deciding, so no page flashes.
const isPending = computed(() => needsFlags.value && !isLoaded.value);
const isBlocked = computed(
  () => needsFlags.value && isLoaded.value && !isRouteOn(route)
);
</script>

<template>
  <KaloFeatureOff v-if="isBlocked" />
  <div v-else-if="isPending" class="flex-1" data-test="kalo-feature-pending" />
  <router-view v-else />
</template>
