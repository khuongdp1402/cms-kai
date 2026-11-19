<script setup>
import { useI18n } from 'vue-i18n';
import { formatMoney } from './formatMoney';

defineProps({
  funnel: { type: Object, required: true },
});

const { t, te } = useI18n();

// Counter rows (POS, manual orders without a chat, chat orders whose
// conversation was deleted) have no conversations, so no close rate
// (conversion_pct null, see Kchat::Metrics).
const COUNTER_LABELS = {
  pos: 'KALO_METRICS.ROW_POS',
  manual: 'KALO_METRICS.ROW_MANUAL',
  chat: 'KALO_METRICS.ROW_CHAT_ORPHAN',
  unknown: 'KALO_REPORTS.CHANNELS.OTHER',
};
const isCounterRow = row => row.conversion_pct === null;

const channelLabel = raw => {
  if (COUNTER_LABELS[raw]) return t(COUNTER_LABELS[raw]);
  const key = String(raw || '')
    .replace(/^Channel::/, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
  return te(`KALO_REPORTS.CHANNELS.${key}`)
    ? t(`KALO_REPORTS.CHANNELS.${key}`)
    : raw || t('KALO_REPORTS.CHANNELS.OTHER');
};
</script>

<template>
  <div data-test="marketing-funnel" class="flex flex-col gap-4">
    <section class="p-5 border rounded-2xl bg-n-solid-1 border-n-weak">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_REPORTS.FUNNEL.CHANNEL_TITLE') }}
        </h2>
        <span
          data-test="funnel-overall-rate"
          :title="t('KALO_METRICS.CHAT_CONVERSION')"
          class="text-xs font-semibold text-n-slate-11"
        >
          {{
            t('KALO_REPORTS.FUNNEL.OVERVIEW_RATE', {
              rate: funnel.totals?.conversion_pct ?? 0,
              aov: formatMoney(funnel.totals?.avg_order_value ?? 0),
            })
          }}
        </span>
      </div>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr class="text-xs border-b text-n-slate-11 border-n-weak">
              <th class="py-2 pr-3 font-semibold">
                {{ t('KALO_REPORTS.FUNNEL.COL_CHANNEL') }}
              </th>
              <th class="py-2 px-3 font-semibold text-right">
                {{ t('KALO_REPORTS.FUNNEL.COL_LEADS') }}
              </th>
              <th class="py-2 px-3 font-semibold text-right">
                {{ t('KALO_REPORTS.FUNNEL.COL_ORDERS') }}
              </th>
              <th class="py-2 px-3 font-semibold text-right">
                {{ t('KALO_REPORTS.FUNNEL.COL_RATE') }}
              </th>
              <th class="py-2 px-3 font-semibold text-right">
                {{ t('KALO_REPORTS.FUNNEL.COL_REVENUE') }}
              </th>
              <th class="py-2 pl-3 font-semibold text-right">
                {{ t('KALO_REPORTS.FUNNEL.COL_AOV') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in funnel.channel_funnel || []"
              :key="row.channel"
              data-test="funnel-channel"
              :title="
                isCounterRow(row)
                  ? t('KALO_METRICS.COUNTER_ROW')
                  : t('KALO_METRICS.CHANNEL_ROW')
              "
              class="border-b border-n-weak last:border-b-0 text-n-slate-12"
            >
              <td class="py-2 pr-3 font-semibold">
                {{ channelLabel(row.channel) }}
              </td>
              <td class="py-2 px-3 text-right">
                {{
                  isCounterRow(row)
                    ? t('KALO_METRICS.NOT_APPLICABLE')
                    : row.conversations
                }}
              </td>
              <td class="py-2 px-3 text-right">{{ row.orders }}</td>
              <td class="py-2 px-3 font-semibold text-right">
                {{
                  isCounterRow(row)
                    ? t('KALO_METRICS.NOT_APPLICABLE')
                    : `${row.conversion_pct}%`
                }}
              </td>
              <td class="py-2 px-3 font-bold text-right">
                {{ formatMoney(row.revenue) }}
              </td>
              <td class="py-2 pl-3 text-right text-n-slate-11">
                {{ formatMoney(row.avg_order_value) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="p-5 border rounded-2xl bg-n-solid-1 border-n-weak">
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_REPORTS.FUNNEL.CAMPAIGNS_TITLE') }}
        </h2>
        <div v-if="funnel.campaigns?.length" class="mt-3 overflow-x-auto">
          <table class="w-full text-sm text-left border-collapse">
            <thead>
              <tr class="text-xs border-b text-n-slate-11 border-n-weak">
                <th class="py-2 pr-2 font-semibold">
                  {{ t('KALO_REPORTS.FUNNEL.COL_CAMPAIGN') }}
                </th>
                <th class="py-2 px-2 font-semibold">
                  {{ t('KALO_REPORTS.FUNNEL.COL_SOURCE') }}
                </th>
                <th class="py-2 px-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_LEADS') }}
                </th>
                <th class="py-2 px-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_ORDERS') }}
                </th>
                <th class="py-2 pl-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_REVENUE') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in funnel.campaigns"
                :key="`${row.campaign}-${row.source}`"
                data-test="funnel-campaign"
                class="border-b border-n-weak last:border-b-0 text-n-slate-12"
              >
                <td class="py-2 pr-2 font-semibold">{{ row.campaign }}</td>
                <td class="py-2 px-2 text-xs text-n-slate-11">
                  {{ channelLabel(row.source) }}
                </td>
                <td class="py-2 px-2 text-right">{{ row.conversations }}</td>
                <td class="py-2 px-2 text-right">
                  {{ row.orders }} ({{ row.conversion_pct }}%)
                </td>
                <td class="py-2 pl-2 font-bold text-right">
                  {{ formatMoney(row.revenue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-3 text-xs text-n-slate-11">
          {{ t('KALO_REPORTS.FUNNEL.CAMPAIGNS_EMPTY') }}
        </p>
      </section>

      <section class="p-5 border rounded-2xl bg-n-solid-1 border-n-weak">
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_REPORTS.FUNNEL.AGENTS_TITLE') }}
        </h2>
        <div v-if="funnel.agents?.length" class="mt-3 overflow-x-auto">
          <table class="w-full text-sm text-left border-collapse">
            <thead>
              <tr class="text-xs border-b text-n-slate-11 border-n-weak">
                <th class="py-2 pr-2 font-semibold">
                  {{ t('KALO_REPORTS.FUNNEL.COL_AGENT') }}
                </th>
                <th class="py-2 px-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_LEADS') }}
                </th>
                <th class="py-2 px-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_ORDERS') }}
                </th>
                <th class="py-2 pl-2 font-semibold text-right">
                  {{ t('KALO_REPORTS.FUNNEL.COL_REVENUE') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in funnel.agents"
                :key="row.agent_id"
                data-test="funnel-agent"
                class="border-b border-n-weak last:border-b-0 text-n-slate-12"
              >
                <td class="py-2 pr-2 font-semibold">{{ row.name }}</td>
                <td class="py-2 px-2 text-right">{{ row.conversations }}</td>
                <td class="py-2 px-2 text-right">
                  {{ row.orders }} ({{ row.conversion_pct }}%)
                </td>
                <td class="py-2 pl-2 font-bold text-right">
                  {{ formatMoney(row.revenue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-3 text-xs text-n-slate-11">
          {{ t('KALO_REPORTS.FUNNEL.AGENTS_EMPTY') }}
        </p>
      </section>
    </div>
  </div>
</template>
