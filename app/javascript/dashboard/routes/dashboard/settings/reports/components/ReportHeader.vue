<script setup>
import BackButton from 'dashboard/components/widgets/BackButton.vue';

defineProps({
  headerTitle: {
    required: true,
    type: String,
  },
  headerDescription: {
    type: String,
    default: '',
  },
  hasBackButton: {
    type: Boolean,
    default: false,
  },
});
</script>

<!-- Page header of the detailed reports, following KaloPageHeader (spec §2):
     sticky, title + one short description on the left, actions on the right.
     The band uses the canvas colour because it lives inside the centred
     ReportsWrapper column. -->
<template>
  <header
    data-test-id="kalo-page-header"
    class="sticky top-0 z-20 flex flex-col gap-1 px-4 mb-5 -mx-4 border-b py-3.5 sm:px-6 sm:-mx-6 lg:px-8 lg:-mx-8 bg-n-background/95 backdrop-blur-md border-n-weak"
  >
    <div v-if="hasBackButton">
      <BackButton compact />
    </div>
    <div class="flex flex-wrap items-center justify-between w-full gap-3">
      <div class="min-w-0">
        <h1
          class="text-lg font-extrabold tracking-tight sm:text-xl text-n-slate-12"
        >
          {{ headerTitle }}
        </h1>
        <p
          v-if="headerDescription"
          data-test-id="kalo-page-description"
          class="mb-0 text-xs sm:text-sm text-n-slate-10 line-clamp-2"
        >
          {{ headerDescription }}
        </p>
      </div>
      <div
        v-if="$slots.default"
        data-test-id="kalo-page-actions"
        class="flex flex-wrap items-center gap-2 shrink-0"
      >
        <slot />
      </div>
    </div>
  </header>
</template>
