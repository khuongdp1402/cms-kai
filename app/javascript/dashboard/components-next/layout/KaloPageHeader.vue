<script setup>
/**
 * Sticky page header (guided UX spec §2): title + one-line description on the
 * left, every action grouped on the right (at most one primary button).
 */
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  maxWidthClass: { type: String, default: 'max-w-[1360px]' },
});
</script>

<template>
  <header
    data-test-id="kalo-page-header"
    class="sticky top-0 z-20 border-b shrink-0 bg-n-surface-1/95 backdrop-blur-md border-n-weak"
  >
    <div
      class="flex flex-col w-full gap-3 px-4 py-3.5 mx-auto sm:px-6 lg:px-8"
      :class="maxWidthClass"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center min-w-0 gap-3">
          <slot name="leading" />
          <div class="min-w-0">
            <slot name="title">
              <h1
                v-if="title"
                class="text-lg font-extrabold tracking-tight truncate sm:text-xl text-n-slate-12"
              >
                {{ title }}
              </h1>
            </slot>
            <p
              v-if="description"
              data-test-id="kalo-page-description"
              class="text-xs truncate sm:text-sm text-n-slate-10"
            >
              {{ description }}
            </p>
          </div>
        </div>
        <div
          v-if="$slots.actions"
          data-test-id="kalo-page-actions"
          class="flex flex-wrap items-center gap-2 max-sm:w-full"
        >
          <slot name="actions" />
        </div>
      </div>
      <slot name="tabs" />
    </div>
  </header>
</template>
