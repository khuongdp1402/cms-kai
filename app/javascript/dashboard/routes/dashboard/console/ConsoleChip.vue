<script setup>
import { computed } from 'vue';

const props = defineProps({
  tone: { type: String, default: 'gray' },
});

const TONES = {
  ok: 'bg-n-teal-3 text-n-teal-11',
  warn: 'bg-n-amber-3 text-n-amber-11',
  new: 'bg-console-bg text-console-soft',
  gray: 'bg-n-slate-3 text-n-slate-11',
};

const toneClass = computed(() => TONES[props.tone]);
</script>

<template>
  <span
    data-testid="status-chip"
    class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
    :class="toneClass"
  >
    <slot />
  </span>
</template>
