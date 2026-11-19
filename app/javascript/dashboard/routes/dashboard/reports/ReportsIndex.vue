<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import reportsAPI from 'dashboard/api/kchat/reports';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import { formatMoney } from './formatMoney';
import SalesChart from './SalesChart.vue';
import ChannelShare from './ChannelShare.vue';
import TopProducts from './TopProducts.vue';
import MultiBrandOverviewBar from './MultiBrandOverviewBar.vue';
import MarketingFunnelSection from './MarketingFunnelSection.vue';

const { t } = useI18n();
const router = useRouter();
const { accountId, accountScopedRoute } = useAccount();

const RANGES = [
  { value: 'today', labelKey: 'KALO_REPORTS.RANGES.TODAY' },
  { value: '7d', labelKey: 'KALO_REPORTS.RANGES.SEVEN_DAYS' },
  { value: 'month', labelKey: 'KALO_REPORTS.RANGES.MONTH' },
];

const DETAIL_LINKS = [
  { key: 'REPORT_OVERVIEW', icon: 'chart', route: 'account_overview_reports' },
  { key: 'REPORT_CONVERSATIONS', icon: 'msg', route: 'conversation_reports' },
  { key: 'REPORT_AGENTS', icon: 'users', route: 'agent_reports_index' },
  { key: 'REPORT_LABELS', icon: 'tag', route: 'label_reports_index' },
  { key: 'REPORT_INBOXES', icon: 'msg', route: 'inbox_reports_index' },
  { key: 'REPORT_TEAMS', icon: 'home', route: 'team_reports_index' },
  { key: 'REPORT_CSAT', icon: 'check', route: 'csat_reports' },
];

const range = ref('today');
const summary = ref(null);
const funnel = ref(null);
const brands = ref([]);
const isLoading = ref(false);
const hasError = ref(false);

let latestRequest = 0;

const loadOptionalEndpoints = (request, targetRange) => {
  if (typeof reportsAPI.funnel === 'function') {
    reportsAPI
      .funnel(targetRange)
      .then(({ data }) => {
        if (request === latestRequest) funnel.value = data || null;
      })
      .catch(() => {
        if (request === latestRequest) funnel.value = null;
      });
  }
  if (typeof reportsAPI.brandsOverview === 'function') {
    reportsAPI
      .brandsOverview(targetRange)
      .then(({ data }) => {
        if (request === latestRequest) {
          brands.value = Array.isArray(data?.brands) ? data.brands : [];
        }
      })
      .catch(() => {
        if (request === latestRequest) brands.value = [];
      });
  }
};

const load = async () => {
  latestRequest += 1;
  const request = latestRequest;
  isLoading.value = true;
  hasError.value = false;
  loadOptionalEndpoints(request, range.value);
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

const detailReportLinks = computed(() =>
  DETAIL_LINKS.filter(item => router.hasRoute(item.route)).map(item => ({
    ...item,
    to: accountScopedRoute(item.route),
  }))
);

onMounted(load);
</script>

<template>
  <KaloPage :title="t('KALO_REPORTS.TITLE')">
    <template #actions>
      <div
        role="tablist"
        :aria-label="t('KALO_REPORTS.RANGE_LABEL')"
        class="inline-flex gap-1 p-1 border rounded-xl bg-n-solid-2 border-n-weak"
      >
        <button
          v-for="item in RANGES"
          :key="item.value"
          type="button"
          role="tab"
          :aria-selected="range === item.value"
          class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          :class="
            range === item.value
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-10 hover:text-n-slate-12'
          "
          @click="selectRange(item.value)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
    </template>

    <p v-if="hasError" data-test="error" class="mt-2 text-sm text-n-slate-11">
      {{ t('KALO_REPORTS.ERROR') }}
    </p>
    <p v-else-if="!summary && isLoading" class="mt-2 text-sm text-n-slate-11">
      {{ t('KALO_REPORTS.LOADING') }}
    </p>

    <template v-if="summary && !hasError">
      <MultiBrandOverviewBar :brands="brands" :current-account-id="accountId" />
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <p class="text-xs font-semibold text-n-slate-10">
            {{ t(`KALO_REPORTS.KPI.${kpi.key}`) }}
          </p>
          <b class="text-2xl font-extrabold text-n-slate-12 tabular-nums">
            {{ kpi.value }}
          </b>
        </div>
      </div>

      <div
        v-if="isEmpty"
        class="flex flex-col items-center gap-4 py-12 text-center border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
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
        <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <SalesChart :daily="summary.daily" :today="summary.today" />
          <ChannelShare :channels="summary.channels" />
        </div>
        <TopProducts :products="summary.top_products" />
      </template>
      <MarketingFunnelSection
        v-if="funnel && (!isEmpty || funnel.totals?.conversations_count > 0)"
        :funnel="funnel"
      />
    </template>

    <section
      v-if="detailReportLinks.length"
      data-test="reports-detail-links"
      class="p-5 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
    >
      <h2 class="mb-3 text-sm font-bold text-n-slate-12">
        {{ t('KALO_REPORTS.DETAIL_LINKS_TITLE') }}
      </h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <router-link
          v-for="link in detailReportLinks"
          :key="link.key"
          :to="link.to"
          class="flex items-start gap-3 p-3 transition-colors border rounded-xl bg-n-solid-2 border-n-weak hover:border-n-brand/40 hover:bg-n-blue-3/40"
        >
          <KaloIcon
            :name="link.icon"
            class="mt-0.5 size-4 text-n-blue-11 shrink-0"
          />
          <div class="min-w-0">
            <b class="block text-sm font-semibold text-n-slate-12">
              {{ t(`KALO_SETTINGS_UI.HUB.LINKS.${link.key}.TITLE`) }}
            </b>
            <span class="block text-xs text-n-slate-10">
              {{ t(`KALO_SETTINGS_UI.HUB.LINKS.${link.key}.DESC`) }}
            </span>
          </div>
        </router-link>
      </div>
    </section>
  </KaloPage>
</template>
