<script setup>
import { computed } from 'vue';
import { weekdayLabels } from 'shared/helpers/dateLocale';

// Monday-first narrow labels in the app locale (T2 … CN in Vietnamese).
const calendarWeeks = computed(() =>
  weekdayLabels().map((label, index) => ({ id: index + 1, label }))
);
</script>

<template>
  <div class="max-w-md mx-auto grid grid-cols-7 gap-2">
    <div
      v-for="day in calendarWeeks"
      :key="day.id"
      class="flex items-center justify-center font-medium text-sm w-9 h-7 py-1.5 px-2"
    >
      {{ day.label }}
    </div>
  </div>
</template>
