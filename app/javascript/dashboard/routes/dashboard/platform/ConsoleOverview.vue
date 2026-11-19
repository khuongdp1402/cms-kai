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
  Object.values(data.value?.shops_by_plan || {}).reduce((sum, n) => sum + n, 0)
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
    const count = data.value.shops_by_plan[plan.key] ?? 0;
    return { ...plan, count, width: WIDTHS[Math.round((count / total) * 12)] };
  });
});

const cassoRateLabel = computed(() => {
  const rate = data.value?.health?.matched_rate_pct;
  return rate === null || rate === undefined
    ? t('KALO_CONSOLE.OVERVIEW.HEALTH.NO_DATA')
    : `${rate}%`;
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
  <section class="flex flex-col w-full gap-5 p-6 mx-auto max-w-[1360px]">
    <header>
      <h1 class="text-xl font-extrabold text-console-ink">
        {{ t('KALO_CONSOLE.OVERVIEW.TITLE') }}
      </h1>
      <p class="mt-0.5 text-sm text-console-muted">
        {{ t('KALO_CONSOLE.OVERVIEW.SUBTITLE') }}
      </p>
    </header>

    <div v-if="failed" class="flex items-center gap-3 text-sm">
      {{ t('KALO_CONSOLE.COMMON.ERROR') }}
      <button
        type="button"
        class="font-semibold text-console-accent"
        @click="load"
      >
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
          <b class="block mt-1 text-2xl tabular-nums text-console-ink">
            {{ kpi.value }}
          </b>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div
          class="min-w-0 overflow-hidden bg-white border rounded-2xl border-console-line"
        >
          <div class="flex items-center px-4 py-3.5">
            <b class="text-console-ink">
              {{ t('KALO_CONSOLE.OVERVIEW.LATEST') }}
            </b>
            <RouterLink
              :to="{ name: 'kalo_platform_payments' }"
              class="ml-auto text-sm font-semibold text-console-accent hover:underline"
            >
              {{ t('KALO_CONSOLE.OVERVIEW.VIEW_ALL') }}
            </RouterLink>
          </div>
          <p
            v-if="!data.recent_payments.length"
            class="px-4 py-5 text-sm border-t border-console-line text-console-muted"
          >
            {{ t('KALO_CONSOLE.OVERVIEW.EMPTY_PAYMENTS') }}
          </p>
          <ul v-else class="list-none">
            <li
              v-for="payment in data.recent_payments"
              :key="payment.id"
              class="flex flex-wrap items-center px-4 py-3 transition-colors border-t gap-x-3 gap-y-1 border-console-line hover:bg-console-bg/50"
            >
              <div class="flex-1 min-w-0">
                <b class="block truncate text-console-ink">
                  {{
                    payment.account_name ||
                    t('KALO_CONSOLE.OVERVIEW.UNKNOWN_SHOP')
                  }}
                </b>
                <span class="text-xs text-console-muted tabular-nums">
                  {{ formatTime(payment.received_at) }}
                </span>
              </div>
              <b class="tabular-nums text-console-ink">
                {{ formatMoney(payment.amount) }}
              </b>
              <ConsoleChip :tone="statusOf(payment.status).tone">
                {{ statusOf(payment.status).text }}
              </ConsoleChip>
            </li>
          </ul>
        </div>

        <div
          class="flex flex-col gap-4 p-4 bg-white border rounded-2xl border-console-line"
        >
          <b class="text-console-ink">{{
            t('KALO_CONSOLE.OVERVIEW.BY_PLAN')
          }}</b>
          <div v-for="bar in bars" :key="bar.key" data-testid="plan-row">
            <div class="flex mb-1.5 text-sm">
              <span class="text-console-ink">
                {{ t(`KALO_CONSOLE.PLANS.${bar.label}`) }}
              </span>
              <span class="ml-auto font-semibold tabular-nums text-console-ink">
                {{ bar.count }}
              </span>
            </div>
            <div class="h-2.5 rounded-full bg-console-bg">
              <div class="h-2.5 rounded-full" :class="[bar.bar, bar.width]" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="data.health"
        data-testid="console-health"
        class="p-4 bg-white border rounded-2xl border-console-line"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <b class="text-console-ink">
            {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.TITLE') }}
          </b>
          <RouterLink
            v-if="data.health.mailhog_enabled"
            data-testid="console-health-mail"
            :to="{ name: 'kalo_platform_emails' }"
            class="text-xs font-semibold text-console-accent hover:underline"
          >
            {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.OPEN_MAIL') }}
          </RouterLink>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="p-3 rounded-xl bg-console-bg/70">
            <p class="text-xs text-console-muted">
              {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.ACTIVE_SHOPS') }}
            </p>
            <b class="block mt-1 text-lg tabular-nums text-console-ink">
              {{ data.health.active_shops }}
            </b>
          </div>
          <div class="p-3 rounded-xl bg-console-bg/70">
            <p class="text-xs text-console-muted">
              {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.CASSO_RATE') }}
            </p>
            <b class="block mt-1 text-lg tabular-nums text-console-ink">
              {{ cassoRateLabel }}
            </b>
          </div>
          <div class="p-3 rounded-xl bg-console-bg/70">
            <p class="text-xs text-console-muted">
              {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.ZALO_CHANNELS') }}
            </p>
            <b class="block mt-1 text-lg tabular-nums text-console-ink">
              {{ data.health.zalo_channels }}
            </b>
          </div>
          <div class="p-3 rounded-xl bg-console-bg/70">
            <p class="text-xs text-console-muted">
              {{ t('KALO_CONSOLE.OVERVIEW.HEALTH.AI_GATEWAY') }}
            </p>
            <div class="mt-1">
              <ConsoleChip :tone="data.health.ai_ready ? 'ok' : 'gray'">
                {{
                  data.health.ai_ready
                    ? t('KALO_CONSOLE.OVERVIEW.HEALTH.READY')
                    : t('KALO_CONSOLE.OVERVIEW.HEALTH.NOT_SET')
                }}
              </ConsoleChip>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
