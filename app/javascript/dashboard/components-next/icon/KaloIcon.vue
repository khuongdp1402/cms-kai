<script setup>
import { computed } from 'vue';
import { KALO_ICON_NAMES } from './kaloIconNames';

const props = defineProps({
  name: { type: String, required: true },
});

// The sprite file styles its own root <svg>, which never reaches the instantiated symbols,
// so the stroke/fill defaults (inherited through <use>) are set on the host svg below.
const href = computed(() => {
  if (!KALO_ICON_NAMES.includes(props.name)) {
    throw new Error(`Unknown KaloIcon name: ${props.name}`);
  }
  return `/kalo-icons.svg#i-${props.name}`;
});
</script>

<template>
  <svg
    aria-hidden="true"
    class="shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
  >
    <use :href="href" />
  </svg>
</template>
