<script setup>
import { computed } from 'vue';
import { KALO_ICON_NAMES } from './kaloIconNames';

const props = defineProps({
  name: { type: String, required: true },
});

const href = computed(() => {
  if (!KALO_ICON_NAMES.includes(props.name)) {
    throw new Error(`Unknown KaloIcon name: ${props.name}`);
  }
  return `/kalo-icons.svg#i-${props.name}`;
});
</script>

<template>
  <svg aria-hidden="true" class="shrink-0">
    <use :href="href" />
  </svg>
</template>
