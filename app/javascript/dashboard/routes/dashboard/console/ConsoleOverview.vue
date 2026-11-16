<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleChip from './ConsoleChip.vue';
import { formatMoney, formatTime } from './formatMoney';

const { t } = useI18n();
const data = ref(null);
const failed = ref(false);

const PLAN_BARS = [
  { key: 'starter', label: 'STARTER', bar: 'bg-console-light' },
  { key: 'growth', label: 'GROWTH', bar: 'bg-console-soft' },
  { key: 'enterprise', label: 'ENTERPRISE', bar: 'bg-console-sidebar' },
];
const STATUS = {
  matched: { tone: 'ok', label: 'MATCHED' },
  applied: { tone: 'ok', label: 'APPLIED' },
  underpaid: { tone: 'warn', label: 'UNDERPAID' },
  unmatched: { tone: 'warn', label: 'UNMATCHED' },
};

const statusOf = status => ({
  tone: STATUS[status]?.tone ?? 'gray',
  text: STATUS[status]
    ? t(`KALO_CONSOLE.PAYMENTS.STATUS.${STATUS[status].label}`)
    : status,
});

// Tailwind-only bar widths in twelfths (no inline styles).
const WIDTHS = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
];

const paidShops = computed(() =>
  Object.values(data.value.shops_by_plan).reduce((sum, n) => sum + n, 0)
);
const kpis = computed(() => [
  { key: 'SHOPS', value: data.value.shops },
  { key: 'REVENUE', value: formatMoney(data.value.revenue_month) },
  { key: 'EXPIRING', value: data.value.expiring_7d },
  { key: 'UNMATCHED', value: data.value.unmatched_payments },
  { key: 'PAID', value: paidShops.value },
]);
const bars = computed(() => {
  const total = Math.max(paidShops.value, 1);
  return PLAN_BARS.map(plan => {
    const count = data.value.shops_by_plan[plan.key];
    return { ...plan, count, width: WIDTHS[Math.round((count / total) * 12)] };
  });
});

const load = async () => {
  failed.value = false;
  try {
    ({ data: data.value } = await consoleAPI.overview());
  } catch {
    failed.value = true;
  }
};

onMounted(load);
</script>

<template>
  <section class="flex flex-col gap-5 p-6">
    <h1 class="text-xl font-extrabold">
      {{ t('KALO_CONSOLE.OVERVIEW.TITLE') }}
    </h1>

    <div v-if="failed" class="flex items-center gap-3 text-sm">
      {{ t('KALO_CONSOLE.COMMON.ERROR') }}
      <button class="font-semibold text-console-accent" @click="load">
        {{ t('KALO_CONSOLE.COMMON.RETRY') }}
      </button>
    </div>

    <p v-else-if="!data" class="text-sm text-console-muted">
      {{ t('KALO_CONSOLE.COMMON.LOADING') }}
    </p>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          data-testid="kpi"
          class="p-4 bg-white border rounded-2xl border-console-line"
        >
          <p class="text-sm text-console-muted">
            {{ t(`KALO_CONSOLE.OVERVIEW.KPI.${kpi.key}`) }}
          </p>
          <b class="text-2xl">{{ kpi.value }}</b>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div class="bg-white border rounded-2xl border-console-line">
          <div class="flex items-center px-4 pt-4 pb-1">
            <b>{{ t('KALO_CONSOLE.OVERVIEW.LATEST') }}</b>
            <RouterLink
              :to="{ name: 'kalo_console_payments' }"
              class="ml-auto font-semibold text-console-accent"
            >
              {{ t('KALO_CONSOLE.OVERVIEW.VIEW_ALL') }}
            </RouterLink>
          </div>
          <p
            v-if="!data.recent_payments.length"
            class="p-4 text-sm text-console-muted"
          >
            {{ t('KALO_CONSOLE.OVERVIEW.EMPTY_PAYMENTS') }}
          </p>
          <ul v-else class="list-none">
            <li
              v-for="payment in data.recent_payments"
              :key="payment.id"
              class="flex items-center gap-3 px-4 py-3 border-t border-console-line"
            >
              <div class="flex-1 min-w-0">
                <b class="block truncate">
                  {{
                    payment.account_name ||
                    t('KALO_CONSOLE.OVERVIEW.UNKNOWN_SHOP')
                  }}
                </b>
                <span class="text-xs text-console-muted">
                  {{ formatTime(payment.received_at) }}
                </span>
              </div>
              <b>{{ formatMoney(payment.amount) }}</b>
              <ConsoleChip :tone="statusOf(payment.status).tone">
                {{ statusOf(payment.status).text }}
              </ConsoleChip>
            </li>
          </ul>
        </div>

        <div
          class="flex flex-col gap-4 p-4 bg-white border rounded-2xl border-console-line"
        >
          <b>{{ t('KALO_CONSOLE.OVERVIEW.BY_PLAN') }}</b>
          <div v-for="bar in bars" :key="bar.key" data-testid="plan-row">
            <div class="flex mb-1 text-sm">
              {{ t(`KALO_CONSOLE.PLANS.${bar.label}`) }}
              <span class="ml-auto font-semibold">{{ bar.count }}</span>
            </div>
            <div class="h-2 rounded-full bg-console-bg">
              <div class="h-2 rounded-full" :class="[bar.bar, bar.width]" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
