<script setup>
import { ref, useId } from 'vue';
import KaloIcon from 'next/icon/KaloIcon.vue';

/**
 * Small "i" button that explains a metric or a term in plain words.
 * Opens on hover and keyboard focus (desktop) and toggles on tap (mobile).
 */
defineProps({
  text: { type: String, required: true },
  label: { type: String, required: true },
});

const tipId = `kalo-info-hint-${useId()}`;
const isOpen = ref(false);
</script>

<template>
  <span
    class="relative inline-flex"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <button
      type="button"
      data-test-id="kalo-info-hint"
      :aria-label="label"
      :aria-describedby="isOpen ? tipId : undefined"
      :aria-expanded="isOpen"
      class="grid p-0 rounded-full size-5 place-content-center text-n-slate-10 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
      @focus="isOpen = true"
      @blur="isOpen = false"
      @click.stop="isOpen = true"
    >
      <KaloIcon name="info" class="size-4" />
    </button>
    <span
      v-if="isOpen"
      :id="tipId"
      role="tooltip"
      data-test-id="kalo-info-hint-text"
      class="absolute z-50 w-56 px-3 py-2 mt-2 text-xs font-normal leading-snug rounded-lg shadow-lg top-full ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 bg-n-slate-12 text-n-solid-1"
    >
      {{ text }}
    </span>
  </span>
</template>
