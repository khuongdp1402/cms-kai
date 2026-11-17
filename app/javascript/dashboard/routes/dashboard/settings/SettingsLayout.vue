<script setup>
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  noRecordsFound: {
    type: Boolean,
    default: false,
  },
  loadingMessage: {
    type: String,
    default: '',
  },
  noRecordsMessage: {
    type: String,
    default: '',
  },
  emptyIcon: {
    type: String,
    default: 'more',
  },
});
</script>

<template>
  <div class="flex flex-col w-full h-full gap-5 font-inter">
    <slot name="header" />
    <!-- Added to render any templates that should be rendered before body -->
    <main class="min-w-0">
      <slot name="preBody" />
      <slot v-if="isLoading" name="loading">
        <woot-loading-state :message="loadingMessage" />
      </slot>
      <div
        v-else-if="noRecordsFound"
        data-test="settings-empty"
        class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center border border-dashed rounded-2xl border-n-strong bg-n-solid-1"
      >
        <span
          class="grid rounded-2xl size-12 place-items-center bg-n-blue-3 text-n-blue-11"
        >
          <KaloIcon :name="emptyIcon" class="size-6" />
        </span>
        <p class="max-w-sm mb-0 text-sm text-n-slate-11">
          {{ noRecordsMessage }}
        </p>
        <slot name="emptyAction" />
      </div>
      <slot v-else name="body" />
      <!-- Do not delete the slot below. It is required to render anything that is not defined in the above slots. -->
      <slot />
    </main>
  </div>
</template>
