<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import reportsAPI from 'dashboard/api/kchat/reports';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloSetupChecklist from 'dashboard/components-next/guide/KaloSetupChecklist.vue';
import KaloInfoHint from 'dashboard/components-next/guide/KaloInfoHint.vue';
import MultiBrandOverviewBar from '../reports/MultiBrandOverviewBar.vue';
import { formatMoney } from '../reports/formatMoney';

const { t, te } = useI18n();
const { accountId, accountScopedRoute } = useAccount();
const { isOn } = useKaloFeatures();
const isPosOn = computed(() => isOn(FEATURE_FLAGS.KALO_POS));

const RANGES = [
  { value: 'today', labelKey: 'KALO_OVERVIEW.RANGES.TODAY' },
  { value: '7d', labelKey: 'KALO_OVERVIEW.RANGES.SEVEN_DAYS' },
  { value: 'month', labelKey: 'KALO_OVERVIEW.RANGES.MONTH' },
];

const range = ref('7d');
const overview = ref(null);
const brands = ref([]);
const isLoading = ref(false);
const hasError = ref(false);

let latestRequest = 0;

const formatDuration = seconds => {
  if (seconds === null || seconds === undefined) {
    return t('KALO_OVERVIEW.KPI.NO_REPLY_YET');
  }
  const s = Math.max(0, Number(seconds));
  if (s < 60) return `${Math.round(s)}s`;
  const mins = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${mins}p ${rem}s`;
};

const ORPHAN_LABELS = {
  chat: 'KALO_METRICS.ROW_CHAT_ORPHAN',
  unknown: 'KALO_REPORTS.CHANNELS.OTHER',
};
const channelLabel = key => {
  if (ORPHAN_LABELS[key]) return t(ORPHAN_LABELS[key]);
  const path = `KALO_OVERVIEW.CHANNELS.${String(key || '').toUpperCase()}`;
  return te(path) ? t(path) : key;
};

const load = async () => {
  latestRequest += 1;
  const req = latestRequest;
  isLoading.value = true;
  hasError.value = false;

  if (typeof reportsAPI.brandsOverview === 'function') {
    reportsAPI
      .brandsOverview(range.value)
      .then(({ data }) => {
        if (req === latestRequest) {
          brands.value = Array.isArray(data?.brands) ? data.brands : [];
        }
      })
      .catch(() => {
        if (req === latestRequest) brands.value = [];
      });
  }

  try {
    const { data } = await reportsAPI.qualityOverview(range.value);
    if (req === latestRequest) overview.value = data;
  } catch {
    if (req === latestRequest) hasError.value = true;
  } finally {
    if (req === latestRequest) isLoading.value = false;
  }
};

const selectRange = value => {
  range.value = value;
  load();
};

const kpis = computed(() => overview.value?.kpis || {});
const skuQuality = computed(() => overview.value?.sku_quality || []);
const channelQuality = computed(() => overview.value?.channel_quality || []);
const actionQueue = computed(() => overview.value?.action_queue || []);

const toneBadgeClass = tone => {
  if (tone === 'err') return 'bg-n-ruby-3 text-n-ruby-11';
  if (tone === 'warn') return 'bg-n-amber-3 text-n-amber-11';
  return 'bg-n-teal-3 text-n-teal-11';
};

onMounted(load);
</script>

<template>
  <KaloPage
    :title="t('KALO_OVERVIEW.TITLE')"
    :description="t('KALO_OVERVIEW.SUBTITLE')"
  >
    <template #actions>
      <div
        role="tablist"
        class="inline-flex gap-1 p-1 border rounded-xl bg-n-solid-2 border-n-weak"
      >
        <button
          v-for="item in RANGES"
          :key="item.value"
          type="button"
          role="tab"
          :data-test="`overview-range-${item.value}`"
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
      <router-link
        v-if="isPosOn"
        :to="accountScopedRoute('kalo_pos')"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2"
      >
        <KaloIcon name="store" class="size-4" />
        {{ t('KALO_OVERVIEW.ACTIONS.OPEN_POS') }}
      </router-link>
      <router-link
        :to="accountScopedRoute('kalo_orders')"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:brightness-110"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_OVERVIEW.ACTIONS.NEW_ORDER') }}
      </router-link>
    </template>

    <KaloSetupChecklist />

    <div
      v-if="hasError"
      data-test="overview-error"
      class="flex items-center justify-between p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
    >
      <span class="text-sm text-n-slate-11">{{
        t('KALO_OVERVIEW.ERROR')
      }}</span>
      <button
        type="button"
        class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-n-blue-3 text-n-blue-11"
        @click="load"
      >
        {{ t('KALO_OVERVIEW.ACTIONS.RETRY') }}
      </button>
    </div>

    <p
      v-else-if="!overview && isLoading"
      class="py-10 text-sm text-center text-n-slate-10"
    >
      {{ t('KALO_OVERVIEW.LOADING') }}
    </p>

    <template v-else-if="overview">
      <MultiBrandOverviewBar
        v-if="brands.length > 1"
        :brands="brands"
        :current-account-id="accountId"
      />

      <!-- Row 1: 4 Output Quality KPI cards -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          data-test="overview-kpi-revenue"
          :title="t('KALO_METRICS.REVENUE')"
          class="flex flex-col gap-1.5 p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1 text-xs font-semibold text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.KPI.REVENUE') }}
              <KaloInfoHint
                :label="t('KALO_POLISH3.HINT_LABEL')"
                :text="t('KALO_OVERVIEW.KPI.REVENUE_HINT')"
              />
            </span>
            <span
              class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-n-teal-3 text-n-teal-11 tabular-nums"
            >
              {{
                t('KALO_OVERVIEW.KPI.ORDERS_COUNT', {
                  count: kpis.orders_count ?? 0,
                })
              }}
            </span>
          </div>
          <b
            class="text-2xl font-extrabold tracking-tight text-n-slate-12 tabular-nums"
          >
            {{ formatMoney(kpis.revenue ?? 0) }}
          </b>
          <span class="text-xs text-n-slate-10 tabular-nums">
            {{
              t('KALO_OVERVIEW.KPI.AOV', { amount: formatMoney(kpis.aov ?? 0) })
            }}
          </span>
        </div>

        <div
          data-test="overview-kpi-cvr"
          :title="t('KALO_METRICS.CHAT_CONVERSION')"
          class="flex flex-col gap-1.5 p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1 text-xs font-semibold text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.KPI.CHAT_CVR') }}
              <KaloInfoHint
                :label="t('KALO_POLISH3.HINT_LABEL')"
                :text="t('KALO_OVERVIEW.KPI.CHAT_CVR_HINT')"
              />
            </span>
            <KaloIcon name="bag" class="size-4 text-n-slate-10" />
          </div>
          <b
            class="text-2xl font-extrabold tracking-tight text-n-slate-12 tabular-nums"
          >
            {{ `${kpis.chat_to_order_cvr_pct ?? 0}%` }}
          </b>
          <span class="text-xs text-n-slate-10 tabular-nums">
            {{
              t('KALO_OVERVIEW.KPI.CHAT_SUB', {
                orders: kpis.conversations_with_orders ?? 0,
                convs: kpis.conversations_count ?? 0,
                pending: kpis.pending_qr_count ?? 0,
              })
            }}
          </span>
        </div>

        <div
          data-test="overview-kpi-sla"
          class="flex flex-col gap-1.5 p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1 text-xs font-semibold text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.KPI.CSKH_SLA') }}
              <KaloInfoHint
                :label="t('KALO_POLISH3.HINT_LABEL')"
                :text="t('KALO_OVERVIEW.KPI.CSKH_SLA_HINT')"
              />
            </span>
            <span
              class="px-2 py-0.5 text-[11px] font-semibold rounded-full tabular-nums"
              :class="
                (kpis.waiting_over_15m_count ?? 0) > 0
                  ? 'bg-n-amber-3 text-n-amber-11'
                  : 'bg-n-teal-3 text-n-teal-11'
              "
            >
              {{
                t('KALO_OVERVIEW.KPI.SLA_ALERT_BADGE', {
                  count: kpis.waiting_over_15m_count ?? 0,
                })
              }}
            </span>
          </div>
          <b
            class="text-2xl font-extrabold tracking-tight text-n-slate-12 tabular-nums"
          >
            {{ formatDuration(kpis.avg_first_response_seconds) }}
          </b>
          <span class="text-xs text-n-slate-10 tabular-nums">
            {{
              t('KALO_OVERVIEW.KPI.SLA_SUB', {
                sla: kpis.sla_under_5m_pct ?? 0,
                waiting: kpis.waiting_over_15m_count ?? 0,
              })
            }}
          </span>
        </div>

        <div
          data-test="overview-kpi-content"
          class="flex flex-col gap-1.5 p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="inline-flex items-center gap-1 text-xs font-semibold text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.KPI.CONTENT_TITLE') }}
              <KaloInfoHint
                :label="t('KALO_POLISH3.HINT_LABEL')"
                :text="t('KALO_OVERVIEW.KPI.CONTENT_HINT')"
              />
            </span>
            <KaloIcon name="spark" class="size-4 text-n-brand" />
          </div>
          <b
            class="text-2xl font-extrabold tracking-tight text-n-slate-12 tabular-nums"
          >
            {{
              t('KALO_OVERVIEW.KPI.PHONES_HIDDEN', {
                count: kpis.phones_protected_count ?? 0,
              })
            }}
          </b>
          <span class="text-xs text-n-slate-10 tabular-nums">
            {{
              t('KALO_OVERVIEW.KPI.CALENDAR', {
                scheduled: kpis.calendar_scheduled_count ?? 0,
                total: kpis.calendar_total_count ?? 0,
                approved: kpis.ai_jobs_approved_count ?? 0,
              })
            }}
          </span>
        </div>
      </div>

      <!-- Row 2: SKU Quality & Action Queue -->
      <div class="grid gap-5 lg:grid-cols-[7fr_5fr] items-start">
        <div class="flex flex-col gap-5 min-w-0">
          <KaloCard
            flush
            :title="t('KALO_OVERVIEW.SKU.TITLE')"
            :description="t('KALO_OVERVIEW.SKU.SUBTITLE')"
          >
            <template #actions>
              <router-link
                :to="accountScopedRoute('kalo_orders')"
                class="px-3 py-1.5 text-xs font-semibold border rounded-lg border-n-strong text-n-slate-12 hover:bg-n-solid-2 shrink-0"
              >
                {{ t('KALO_OVERVIEW.ACTIONS.VIEW_ORDERS') }}
              </router-link>
            </template>
            <p
              v-if="!skuQuality.length"
              class="px-5 py-8 text-sm text-center text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.EMPTY_SKU') }}
            </p>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr
                    class="text-xs font-semibold uppercase border-b bg-n-solid-2 border-n-weak text-n-slate-10"
                  >
                    <th class="px-4 py-2.5 text-left">
                      {{ t('KALO_OVERVIEW.SKU.PRODUCT') }}
                    </th>
                    <th class="px-4 py-2.5 text-right">
                      {{ t('KALO_OVERVIEW.SKU.SOLD') }}
                    </th>
                    <th class="px-4 py-2.5 text-right">
                      {{ t('KALO_OVERVIEW.SKU.CANCEL_RATE') }}
                    </th>
                    <th class="px-4 py-2.5 text-right">
                      {{ t('KALO_OVERVIEW.SKU.REVENUE') }}
                    </th>
                    <th class="px-4 py-2.5 text-left">
                      {{ t('KALO_OVERVIEW.SKU.STATUS') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-n-weak">
                  <tr v-for="sku in skuQuality" :key="sku.product_id">
                    <td class="px-4 py-3">
                      <b class="block font-semibold text-n-slate-12">
                        {{ sku.name }}
                      </b>
                      <span
                        v-if="sku.stock !== null && sku.stock !== undefined"
                        class="text-xs text-n-slate-10 tabular-nums"
                      >
                        {{ t('KALO_OVERVIEW.SKU.STOCK', { count: sku.stock }) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-medium text-right tabular-nums">
                      {{ sku.sold_qty }}
                    </td>
                    <td class="px-4 py-3 font-medium text-right tabular-nums">
                      {{ `${sku.cancel_rate_pct}%` }}
                    </td>
                    <td class="px-4 py-3 font-semibold text-right tabular-nums">
                      {{ formatMoney(sku.revenue) }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
                        :class="
                          sku.needs_attention
                            ? 'bg-n-amber-3 text-n-amber-11'
                            : 'bg-n-teal-3 text-n-teal-11'
                        "
                      >
                        {{
                          sku.needs_attention
                            ? t('KALO_OVERVIEW.SKU.NEED_CHECK')
                            : t('KALO_OVERVIEW.SKU.OK')
                        }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </KaloCard>

          <KaloCard :title="t('KALO_OVERVIEW.CHANNEL_TITLE')">
            <p
              v-if="!channelQuality.length"
              class="py-4 text-sm text-center text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.EMPTY_CHANNEL') }}
            </p>
            <div v-else class="flex flex-col gap-3">
              <div
                v-for="ch in channelQuality"
                :key="ch.channel"
                data-test="overview-channel-row"
                :title="
                  ch.cvr_pct === null
                    ? t('KALO_METRICS.COUNTER_ROW')
                    : t('KALO_METRICS.CHANNEL_ROW')
                "
                class="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-xl bg-n-solid-2 border-n-weak"
              >
                <b class="text-sm font-semibold text-n-slate-12">
                  {{ channelLabel(ch.channel) }}
                </b>
                <div
                  class="flex flex-wrap items-center gap-3 text-xs text-n-slate-11 tabular-nums"
                >
                  <span v-if="ch.cvr_pct !== null">
                    {{
                      t('KALO_OVERVIEW.CHANNEL_CHATS', {
                        count: ch.conversations_count,
                      })
                    }}
                  </span>
                  <span>
                    {{
                      t('KALO_OVERVIEW.CHANNEL_ORDERS', {
                        count: ch.orders_count,
                      })
                    }}
                  </span>
                  <span
                    v-if="ch.cvr_pct !== null"
                    class="font-bold text-n-slate-12"
                  >
                    {{ t('KALO_OVERVIEW.CHANNEL_CVR', { pct: ch.cvr_pct }) }}
                  </span>
                </div>
              </div>
            </div>
          </KaloCard>
        </div>

        <!-- Actionable Queue -->
        <KaloCard :title="t('KALO_OVERVIEW.QUEUE.TITLE')">
          <template v-if="actionQueue.length" #actions>
            <span
              class="px-2 py-0.5 text-xs font-bold rounded-full bg-n-blue-3 text-n-blue-11 tabular-nums"
            >
              {{ actionQueue.length }}
            </span>
          </template>
          <div class="flex flex-col gap-3">
            <p
              v-if="!actionQueue.length"
              data-test="overview-queue-empty"
              class="p-4 text-sm border rounded-xl bg-n-solid-2 border-n-weak text-n-slate-10"
            >
              {{ t('KALO_OVERVIEW.EMPTY_QUEUE') }}
            </p>
            <div
              v-for="item in actionQueue"
              :key="item.key"
              :data-test="`queue-item-${item.key}`"
              class="flex items-center justify-between gap-3 p-3.5 border rounded-xl bg-n-solid-2 border-n-weak"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 text-[11px] font-bold rounded-full tabular-nums"
                    :class="toneBadgeClass(item.tone)"
                  >
                    {{ item.count }}
                  </span>
                  <b class="text-sm font-semibold truncate text-n-slate-12">
                    {{
                      t(`KALO_OVERVIEW.QUEUE.ITEMS.${item.key}.TITLE`, {
                        count: item.count,
                      })
                    }}
                  </b>
                </div>
                <p class="mt-0.5 text-xs text-n-slate-10">
                  {{ t(`KALO_OVERVIEW.QUEUE.ITEMS.${item.key}.DESC`) }}
                </p>
              </div>
              <router-link
                :to="accountScopedRoute(item.route)"
                class="px-3 py-1.5 text-xs font-semibold border rounded-lg shrink-0 bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-blue-3 hover:text-n-blue-11 hover:border-n-brand/30"
              >
                {{ t(`KALO_OVERVIEW.QUEUE.ITEMS.${item.key}.CTA`) }}
              </router-link>
            </div>
          </div>
        </KaloCard>
      </div>
    </template>
  </KaloPage>
</template>
