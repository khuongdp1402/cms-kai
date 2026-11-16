<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import reportsAPI from 'dashboard/api/kchat/reports';
import Button from 'dashboard/components-next/button/Button.vue';
import { formatMoney } from './formatMoney';
import SalesChart from './SalesChart.vue';
import ChannelShare from './ChannelShare.vue';
import TopProducts from './TopProducts.vue';

const { t } = useI18n();
const router = useRouter();
const { accountScopedRoute } = useAccount();

const RANGES = [
  { value: 'today', labelKey: 'KALO_REPORTS.RANGES.TODAY' },
  { value: '7d', labelKey: 'KALO_REPORTS.RANGES.SEVEN_DAYS' },
  { value: 'month', labelKey: 'KALO_REPORTS.RANGES.MONTH' },
];

const range = ref('today');
const summary = ref(null);
const isLoading = ref(false);
const hasError = ref(false);

let latestRequest = 0;

const load = async () => {
  latestRequest += 1;
  const request = latestRequest;
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data } = await reportsAPI.summary(range.value);
    if (request === latestRequest) summary.value = data;
  } catch {
    if (request === latestRequest) hasError.value = true;
  } finally {
    if (request === latestRequest) isLoading.value = false;
  }
};

const selectRange = value => {
  range.value = value;
  load();
};

const kpis = computed(() => [
  {
    key: 'REVENUE',
    value: formatMoney(summary.value?.revenue ?? 0),
  },
  { key: 'ORDERS', value: summary.value?.orders_count ?? 0 },
  { key: 'WAITING', value: summary.value?.waiting_messages ?? 0 },
  { key: 'CONTACTS', value: summary.value?.new_contacts ?? 0 },
]);

const isEmpty = computed(
  () => summary.value && summary.value.orders_count === 0
);

onMounted(load);
</script>

<template>
  <section class="flex-1 p-6 overflow-auto bg-n-surface-1">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-extrabold text-n-slate-12">
        {{ t('KALO_REPORTS.TITLE') }}
      </h1>
      <div
        role="tablist"
        :aria-label="t('KALO_REPORTS.RANGE_LABEL')"
        class="flex gap-1 p-1 rounded-xl bg-n-alpha-2"
      >
        <button
          v-for="item in RANGES"
          :key="item.value"
          type="button"
          role="tab"
          :aria-selected="range === item.value"
          class="px-3 py-1.5 text-sm font-semibold rounded-lg"
          :class="
            range === item.value
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-11'
          "
          @click="selectRange(item.value)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
    </div>

    <p v-if="hasError" data-test="error" class="mt-6 text-sm text-n-slate-11">
      {{ t('KALO_REPORTS.ERROR') }}
    </p>
    <p v-else-if="!summary && isLoading" class="mt-6 text-sm text-n-slate-11">
      {{ t('KALO_REPORTS.LOADING') }}
    </p>

    <template v-if="summary && !hasError">
      <div class="grid gap-4 mt-6 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <p class="text-sm text-n-slate-11">
            {{ t(`KALO_REPORTS.KPI.${kpi.key}`) }}
          </p>
          <b class="text-2xl font-extrabold text-n-slate-12">{{ kpi.value }}</b>
        </div>
      </div>

      <div
        v-if="isEmpty"
        class="flex flex-col items-center gap-4 py-12 text-center"
      >
        <p data-test="empty" class="text-sm text-n-slate-11">
          {{ t('KALO_REPORTS.EMPTY') }}
        </p>
        <Button
          :label="t('KALO_REPORTS.EMPTY_ACTION')"
          @click="router.push(accountScopedRoute('kalo_orders'))"
        />
      </div>
      <template v-else>
        <div class="grid gap-4 mt-4 lg:grid-cols-[1.6fr_1fr]">
          <SalesChart :daily="summary.daily" />
          <ChannelShare :channels="summary.channels" />
        </div>
        <div class="mt-4">
          <TopProducts :products="summary.top_products" />
        </div>
      </template>
    </template>
  </section>
</template>
