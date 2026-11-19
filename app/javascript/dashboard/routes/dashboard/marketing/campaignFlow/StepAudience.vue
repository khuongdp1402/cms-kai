<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CAMPAIGN_FLOW_KEY,
  AUDIENCE_MODES,
  MAX_RECIPIENTS_PER_RUN,
  channelKey,
} from './campaignFlowHelpers';

const { t } = useI18n();
const flow = inject(CAMPAIGN_FLOW_KEY);
const campaign = flow.campaign;

const MODE_KEYS = { all: 'ALL', segment: 'SEGMENT', labels: 'LABELS' };
const SELECT_CLASS =
  'px-3 py-2 pr-8 mb-0 text-sm border rounded-[10px] outline-none bg-n-solid-1 border-n-strong text-n-slate-12 bg-origin-padding !bg-[position:right_0.75rem_center] focus:border-n-brand';

const channels = computed(() => flow.audience.value?.channels || []);
const metaSkipped = computed(() =>
  channels.value
    .filter(row => row.requires_24h_window)
    .reduce((sum, row) => sum + (row.skipped_24h_count || 0), 0)
);

const overCap = computed(() =>
  channels.value.some(row => row.eligible_count > MAX_RECIPIENTS_PER_RUN)
);

const toggleLabel = title => {
  campaign.labels = campaign.labels.includes(title)
    ? campaign.labels.filter(item => item !== title)
    : [...campaign.labels, title];
};
</script>

<template>
  <div class="flex flex-col gap-5" data-test="campaign-step-audience">
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.MODE') }}
      </legend>
      <div class="grid gap-2 sm:grid-cols-3">
        <label
          v-for="mode in AUDIENCE_MODES"
          :key="mode"
          :data-test="`campaign-audience-${mode}`"
          class="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border cursor-pointer rounded-xl"
          :class="
            campaign.audienceMode === mode
              ? 'border-n-brand bg-n-brand/5 text-n-slate-12'
              : 'border-n-weak bg-n-solid-1 text-n-slate-11 hover:bg-n-solid-2'
          "
        >
          <input
            v-model="campaign.audienceMode"
            type="radio"
            name="campaign-audience"
            :value="mode"
            class="mb-0"
          />
          {{ t(`KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.${MODE_KEYS[mode]}`) }}
        </label>
      </div>
    </fieldset>

    <div
      v-if="campaign.audienceMode === 'segment'"
      class="flex flex-col gap-1.5"
    >
      <label
        v-if="flow.segments.value.length"
        class="flex flex-col gap-1.5 text-sm font-semibold text-n-slate-12"
      >
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.SEGMENT_PICK') }}
        <select
          v-model="campaign.segmentId"
          data-test="campaign-segment"
          :class="SELECT_CLASS"
        >
          <option :value="null" disabled>
            {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.SEGMENT_PICK') }}
          </option>
          <option
            v-for="segment in flow.segments.value"
            :key="segment.id"
            :value="segment.id"
          >
            {{ segment.name }}
          </option>
        </select>
      </label>
      <p v-else class="text-sm text-n-slate-11">
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.SEGMENT_EMPTY') }}
      </p>
      <p class="text-xs text-n-slate-11">
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.SEGMENT_NOTE') }}
      </p>
    </div>

    <div
      v-if="campaign.audienceMode === 'labels'"
      class="flex flex-col gap-1.5"
    >
      <span class="text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.LABELS_PICK') }}
      </span>
      <div v-if="flow.labels.value.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="label in flow.labels.value"
          :key="label"
          type="button"
          data-test="campaign-label"
          :aria-pressed="campaign.labels.includes(label)"
          class="px-2.5 py-1 text-xs font-semibold border rounded-full"
          :class="
            campaign.labels.includes(label)
              ? 'bg-n-brand text-white border-n-brand'
              : 'bg-n-alpha-1 text-n-slate-11 border-n-weak hover:text-n-slate-12'
          "
          @click="toggleLabel(label)"
        >
          {{ `#${label}` }}
        </button>
      </div>
      <p v-else class="text-sm text-n-slate-11">
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.LABELS_EMPTY') }}
      </p>
    </div>

    <section
      data-test="campaign-audience-summary"
      class="flex flex-col gap-3 p-4 border rounded-xl border-n-weak bg-n-solid-2"
      aria-live="polite"
    >
      <p
        v-if="flow.audienceState.value === 'loading'"
        class="text-sm text-n-slate-11"
      >
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.LOADING') }}
      </p>
      <p
        v-else-if="flow.audienceState.value === 'error'"
        class="text-sm font-medium text-n-ruby-11"
      >
        {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.LOAD_ERROR') }}
      </p>
      <template v-else-if="flow.audience.value">
        <p
          data-test="campaign-audience-count"
          class="text-base font-bold text-n-slate-12"
        >
          {{
            t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.AUDIENCE_COUNT', {
              count: flow.audience.value.audience_count,
            })
          }}
        </p>
        <div v-if="channels.length" class="flex flex-col gap-1.5">
          <span
            class="text-xs font-semibold tracking-wide uppercase text-n-slate-10"
          >
            {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.REACH_TITLE') }}
          </span>
          <ul class="flex flex-col gap-1">
            <li
              v-for="row in channels"
              :key="row.inbox_id"
              data-test="campaign-reach-row"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <span class="min-w-0 truncate text-n-slate-12">
                {{ row.inbox_name }}
                <span class="text-n-slate-10">
                  {{
                    `· ${t(`KALO_CAMPAIGN_FLOW.CHANNELS.${channelKey(row.channel_type)}`)}`
                  }}
                </span>
              </span>
              <b class="shrink-0 tabular-nums text-n-slate-12">
                {{
                  t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.REACH_ROW', {
                    count: row.eligible_count,
                  })
                }}
              </b>
            </li>
          </ul>
          <p class="text-xs text-n-slate-11">
            {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.REACH_NOTE') }}
          </p>
          <p
            v-if="overCap"
            data-test="campaign-cap-note"
            class="text-xs font-medium text-n-amber-11"
          >
            {{
              t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.CAP_NOTE', {
                max: MAX_RECIPIENTS_PER_RUN,
              })
            }}
          </p>
          <p
            v-if="metaSkipped"
            data-test="campaign-meta-warning"
            class="text-xs font-medium text-n-amber-11"
          >
            {{
              t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.META_24H', {
                skipped: metaSkipped,
              })
            }}
          </p>
        </div>
        <p v-else class="text-sm text-n-slate-11">
          {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.NO_CHANNELS') }}
          <router-link
            :to="{ name: 'settings_inbox_new' }"
            class="ml-1 font-semibold underline text-n-brand"
          >
            {{ t('KALO_CAMPAIGN_FLOW.AUDIENCE_STEP.CONNECT') }}
          </router-link>
        </p>
      </template>
    </section>
  </div>
</template>
