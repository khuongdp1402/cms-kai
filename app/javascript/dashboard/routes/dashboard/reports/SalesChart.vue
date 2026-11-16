<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatMoney } from './formatMoney';

const props = defineProps({
  daily: { type: Array, required: true },
});

const { t, tm } = useI18n();

const total = computed(() =>
  props.daily.reduce((sum, day) => sum + day.revenue, 0)
);

const bars = computed(() => {
  const max = Math.max(...props.daily.map(day => day.revenue), 0);
  const weekdays = tm('KALO_REPORTS.WEEKDAYS');
  const useWeekdays = props.daily.length <= 7;
  // The server returns days up to today in the account timezone, so the last bar is today.
  return props.daily.map((day, index) => {
    const [year, month, date] = day.date.split('-').map(Number);
    const label = useWeekdays
      ? weekdays[new Date(year, month - 1, date).getDay()]
      : String(date);
    return {
      ...day,
      label,
      isToday: index === props.daily.length - 1,
      height: max > 0 ? Math.max((day.revenue / max) * 100, 2) : 2,
    };
  });
});
</script>

<template>
  <div class="p-5 border rounded-2xl bg-n-solid-1 border-n-weak">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base font-bold text-n-slate-12">
        {{ t('KALO_REPORTS.CHART.TITLE') }}
      </h2>
      <span class="text-sm text-n-slate-11">
        {{ t('KALO_REPORTS.CHART.TOTAL', { total: formatMoney(total) }) }}
      </span>
    </div>
    <div class="flex items-end gap-2 h-44 pt-3">
      <div
        v-for="bar in bars"
        :key="bar.date"
        data-test="bar"
        :data-date="bar.date"
        :data-today="bar.isToday"
        :title="formatMoney(bar.revenue)"
        class="flex flex-col items-center justify-end flex-1 h-full gap-1.5 text-xs min-w-0"
        :class="bar.isToday ? 'font-bold text-n-slate-12' : 'text-n-slate-11'"
      >
        <i
          class="block w-full rounded-t-lg rounded-b"
          :class="bar.isToday ? 'bg-n-brand' : 'bg-n-brand/40'"
          :style="{ height: `${bar.height}%` }"
        />
        {{ bar.label }}
      </div>
    </div>
  </div>
</template>
