<script setup>
import { computed, onMounted, provide, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAlert } from 'dashboard/composables';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import StepGoal from './StepGoal.vue';
import StepAudience from './StepAudience.vue';
import StepContent from './StepContent.vue';
import StepChannel from './StepChannel.vue';
import StepReview from './StepReview.vue';
import CampaignResults from './CampaignResults.vue';
import {
  CAMPAIGN_FLOW_KEY,
  MAX_RECIPIENTS_PER_RUN,
  STEPS,
  buildPayload,
  campaignFromRecord,
  effectiveTag,
  emptyCampaign,
  stepError,
} from './campaignFlowHelpers';

// Guided UX spec §5: six steps in a wide KaloDrawer (the list stays behind it,
// and every step fits a 720px panel; on phones the drawer is full screen).
const props = defineProps({
  draft: { type: Object, default: null },
  // Saved campaigns ({id, campaign_tag}) so the tag stays unique (server does the same).
  existingCampaigns: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'saved']);

const { t, te } = useI18n();
const store = useStore();
const { currentAccount, accountScopedRoute } = useAccount();

const STEP_COMPONENTS = {
  GOAL: StepGoal,
  AUDIENCE: StepAudience,
  CONTENT: StepContent,
  CHANNEL: StepChannel,
  REVIEW: StepReview,
};

const campaign = reactive(
  props.draft ? campaignFromRecord(props.draft) : emptyCampaign()
);
const stepIndex = ref(0);
const showError = ref(false);
const audience = ref(null);
const audienceState = ref('idle');
const blockedPhrases = ref([]);
const aiAvailable = ref(false);
const busy = ref('');
const actionErrorKey = ref('');
const actionErrorText = ref('');
const needsRenewal = ref(false);
const sentId = ref(null);

const step = computed(() => STEPS[stepIndex.value]);
const isResults = computed(() => step.value === 'RESULTS');
const segments = computed(
  () => store.getters['customViews/getContactCustomViews'] || []
);
const labels = computed(() =>
  (store.getters['labels/getLabels'] || []).map(l => l.title).filter(Boolean)
);
const shopName = computed(() => currentAccount.value?.name || '');
const takenTags = computed(() =>
  props.existingCampaigns
    .filter(item => item.id !== campaign.id)
    .map(item => item.campaign_tag)
    .filter(Boolean)
);
const campaignTag = computed(() => effectiveTag(campaign, takenTags.value));

// "Chỉ khách nhắn trong 24 giờ" on a non-Meta channel: counts come from preview.
const only24hStats = ref(null);
const effectiveAudience = computed(() => {
  if (!audience.value) return null;
  const stats = only24hStats.value;
  if (!stats) return audience.value;
  return {
    ...audience.value,
    channels: audience.value.channels.map(row =>
      row.inbox_id === stats.inbox_id
        ? {
            ...row,
            eligible_count: stats.eligible_count,
            skipped_24h_count: stats.skipped_24h_count,
            sample_name: stats.sample_name,
          }
        : row
    ),
  };
});
const selectedChannel = computed(
  () =>
    (effectiveAudience.value?.channels || []).find(
      row => row.inbox_id === campaign.inboxId
    ) || null
);
const recipients = computed(() =>
  Math.min(selectedChannel.value?.eligible_count || 0, MAX_RECIPIENTS_PER_RUN)
);
const currentError = computed(() =>
  stepError(step.value, campaign, { audience: effectiveAudience.value })
);

provide(CAMPAIGN_FLOW_KEY, {
  campaign,
  audience: effectiveAudience,
  audienceState,
  campaignTag,
  segments,
  labels,
  shopName,
  selectedChannel,
  blockedPhrases,
  aiAvailable,
});

let audienceReq = 0;
const loadAudience = async () => {
  audienceReq += 1;
  const mine = audienceReq;
  audienceState.value = 'loading';
  try {
    const { data } = await broadcastsAPI.audience({
      labels:
        campaign.audienceMode === 'labels'
          ? campaign.labels.join(',')
          : undefined,
      segment_id:
        campaign.audienceMode === 'segment'
          ? campaign.segmentId || undefined
          : undefined,
    });
    if (mine !== audienceReq) return;
    audience.value = data;
    audienceState.value = 'ready';
    const reachable = (data.channels || []).filter(r => r.eligible_count > 0);
    if (
      reachable.length &&
      !reachable.some(r => r.inbox_id === campaign.inboxId)
    ) {
      campaign.inboxId = reachable[0].inbox_id;
    }
  } catch {
    if (mine !== audienceReq) return;
    audience.value = null;
    audienceState.value = 'error';
  }
};

watch(
  () => [campaign.audienceMode, campaign.segmentId, campaign.labels.join(',')],
  ([mode, segmentId, labelList]) => {
    audience.value = null;
    if (mode === 'segment' && !segmentId) {
      audienceState.value = 'idle';
      return;
    }
    if (mode === 'labels' && !labelList) {
      audienceState.value = 'idle';
      return;
    }
    loadAudience();
  }
);

let only24hReq = 0;
watch(
  () => [campaign.only24h, campaign.inboxId, audience.value],
  async ([only24h, inboxId, data]) => {
    only24hReq += 1;
    const mine = only24hReq;
    const row = (data?.channels || []).find(r => r.inbox_id === inboxId);
    if (!only24h || !row || row.requires_24h_window) {
      only24hStats.value = null;
      return;
    }
    try {
      const { data: stats } = await broadcastsAPI.preview({
        inbox_id: inboxId,
        labels:
          campaign.audienceMode === 'labels'
            ? campaign.labels.join(',')
            : undefined,
        segment_id:
          campaign.audienceMode === 'segment'
            ? campaign.segmentId || undefined
            : undefined,
        only_24h: true,
      });
      if (mine === only24hReq) only24hStats.value = stats;
    } catch {
      if (mine === only24hReq) only24hStats.value = null;
    }
  }
);

watch(step, () => {
  showError.value = false;
  actionErrorKey.value = '';
  actionErrorText.value = '';
});

const clearActionError = () => {
  actionErrorKey.value = '';
  actionErrorText.value = '';
  needsRenewal.value = false;
};

const applyApiError = (error, fallbackKey) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.error;
  if (status === 403 && code === 'subscription_expired') {
    needsRenewal.value = true;
    actionErrorKey.value = 'KALO_CAMPAIGN_FLOW.REVIEW_STEP.EXPIRED';
  } else if (status === 422 && code) {
    const key = `KALO_CAMPAIGN_FLOW.API_ERRORS.${code}`;
    if (te(key)) actionErrorKey.value = key;
    else actionErrorText.value = code;
  } else {
    actionErrorKey.value = fallbackKey;
  }
};

const checkContent = async () => {
  busy.value = 'check';
  try {
    const { data } = await broadcastsAPI.checkContent(campaign.message.trim());
    blockedPhrases.value = data?.blocked_phrases || [];
    return !blockedPhrases.value.length;
  } catch {
    actionErrorKey.value = 'KALO_CAMPAIGN_FLOW.ERRORS.CHECK_FAILED';
    return false;
  } finally {
    busy.value = '';
  }
};

const send = async () => {
  busy.value = 'send';
  clearActionError();
  try {
    const payload = buildPayload(campaign, {
      draft: false,
      takenTags: takenTags.value,
    });
    const { data } = campaign.id
      ? await broadcastsAPI.updateDraft(campaign.id, payload)
      : await broadcastsAPI.create(payload);
    campaign.id = data.broadcast.id;
    sentId.value = data.broadcast.id;
    emit('saved', data.broadcast);
    stepIndex.value = STEPS.indexOf('RESULTS');
  } catch (error) {
    applyApiError(error, 'KALO_CAMPAIGN_FLOW.REVIEW_STEP.SEND_ERROR');
  } finally {
    busy.value = '';
  }
};

const next = async () => {
  clearActionError();
  if (currentError.value) {
    showError.value = true;
    return;
  }
  if (step.value === 'CONTENT' && !(await checkContent())) return;
  if (step.value === 'REVIEW') {
    await send();
    return;
  }
  stepIndex.value += 1;
};

const back = () => {
  if (stepIndex.value > 0 && !isResults.value) stepIndex.value -= 1;
};

const stepTabClass = index => {
  if (index === stepIndex.value) return 'text-n-slate-12';
  if (index < stepIndex.value) return 'text-n-brand hover:underline';
  return 'text-n-slate-10';
};

const goTo = index => {
  if (index < stepIndex.value && !isResults.value) stepIndex.value = index;
};

const saveDraft = async () => {
  clearActionError();
  if (!campaign.title.trim()) {
    stepIndex.value = 0;
    showError.value = true;
    return;
  }
  busy.value = 'draft';
  try {
    const payload = buildPayload(campaign, {
      draft: true,
      takenTags: takenTags.value,
    });
    const { data } = campaign.id
      ? await broadcastsAPI.updateDraft(campaign.id, payload)
      : await broadcastsAPI.create(payload);
    campaign.id = data.broadcast.id;
    campaign.campaignTag = data.broadcast.campaign_tag || campaign.campaignTag;
    emit('saved', data.broadcast);
    useAlert(t('KALO_CAMPAIGN_FLOW.WIZARD.DRAFT_SAVED'));
  } catch (error) {
    applyApiError(error, 'KALO_CAMPAIGN_FLOW.ERRORS.SAVE_FAILED');
  } finally {
    busy.value = '';
  }
};

const primaryLabel = computed(() => {
  if (busy.value === 'check') return t('KALO_CAMPAIGN_FLOW.WIZARD.CHECKING');
  if (busy.value === 'send') return t('KALO_CAMPAIGN_FLOW.WIZARD.SENDING');
  if (step.value === 'REVIEW') {
    return campaign.scheduleMode === 'later'
      ? t('KALO_CAMPAIGN_FLOW.WIZARD.SCHEDULE', { count: recipients.value })
      : t('KALO_CAMPAIGN_FLOW.WIZARD.SEND_NOW', { count: recipients.value });
  }
  return t('KALO_CAMPAIGN_FLOW.WIZARD.NEXT');
});

const loadAiHealth = async () => {
  try {
    const { data } = await brandGrowthAPI.aiHealth();
    aiAvailable.value = data?.configured === true;
  } catch {
    aiAvailable.value = false;
  }
};

onMounted(() => {
  store.dispatch('customViews/get', 'contact');
  store.dispatch('labels/get');
  loadAudience();
  loadAiHealth();
});
</script>

<template>
  <KaloDrawer
    data-test="campaign-wizard"
    width-class="sm:max-w-[720px]"
    :title="
      draft
        ? t('KALO_CAMPAIGN_FLOW.WIZARD.EDIT_TITLE')
        : t('KALO_CAMPAIGN_FLOW.WIZARD.TITLE')
    "
    @close="emit('close')"
  >
    <nav
      data-tour="campaign-steps"
      data-test="campaign-progress"
      :aria-label="
        t('KALO_CAMPAIGN_FLOW.WIZARD.PROGRESS', {
          current: stepIndex + 1,
          total: STEPS.length,
        })
      "
      class="flex flex-col gap-2"
    >
      <div class="flex items-center justify-between gap-2 text-xs">
        <span class="font-semibold text-n-slate-11">
          {{
            t('KALO_CAMPAIGN_FLOW.WIZARD.PROGRESS', {
              current: stepIndex + 1,
              total: STEPS.length,
            })
          }}
        </span>
        <b class="text-n-slate-12 sm:hidden">
          {{ t(`KALO_CAMPAIGN_FLOW.STEPS.${step}`) }}
        </b>
      </div>
      <div
        class="h-1.5 overflow-hidden rounded-full bg-n-alpha-2"
        role="progressbar"
        :aria-valuenow="stepIndex + 1"
        aria-valuemin="1"
        :aria-valuemax="STEPS.length"
      >
        <div
          class="h-full transition-all rounded-full bg-n-brand"
          :class="
            ['w-1/6', 'w-2/6', 'w-3/6', 'w-4/6', 'w-5/6', 'w-full'][stepIndex]
          "
        />
      </div>
      <ol class="hidden grid-cols-6 gap-1 p-0 m-0 list-none sm:grid">
        <li v-for="(key, index) in STEPS" :key="key">
          <button
            type="button"
            data-test="campaign-step-tab"
            :aria-current="index === stepIndex ? 'step' : undefined"
            :disabled="index >= stepIndex || isResults"
            class="flex items-center w-full gap-1 text-xs font-semibold text-start disabled:cursor-default"
            :class="stepTabClass(index)"
            @click="goTo(index)"
          >
            <KaloIcon v-if="index < stepIndex" name="check" class="size-3.5" />
            <span class="truncate">
              {{ t(`KALO_CAMPAIGN_FLOW.STEPS.${key}`) }}
            </span>
          </button>
        </li>
      </ol>
    </nav>

    <h3
      class="text-base font-bold text-n-slate-12"
      data-test="campaign-step-title"
    >
      {{ t(`KALO_CAMPAIGN_FLOW.STEPS.${step}`) }}
    </h3>

    <CampaignResults v-if="isResults && sentId" :broadcast-id="sentId" />
    <component :is="STEP_COMPONENTS[step]" v-else />

    <p
      v-if="showError && currentError && !isResults"
      data-test="campaign-step-error"
      role="alert"
      class="text-sm font-medium text-n-ruby-11"
    >
      {{ t(`KALO_CAMPAIGN_FLOW.ERRORS.${currentError}`) }}
    </p>
    <p
      v-if="actionErrorKey || actionErrorText"
      data-test="campaign-action-error"
      role="alert"
      class="text-sm font-medium text-n-ruby-11"
    >
      {{ actionErrorKey ? t(actionErrorKey) : actionErrorText }}
      <router-link
        v-if="needsRenewal"
        :to="accountScopedRoute('kalo_billing')"
        class="ml-1 font-semibold underline text-n-brand"
      >
        {{ t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.RENEW') }}
      </router-link>
    </p>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button
            v-if="stepIndex > 0 && !isResults"
            type="button"
            data-test="campaign-back"
            class="px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3"
            @click="back"
          >
            {{ t('KALO_CAMPAIGN_FLOW.WIZARD.BACK') }}
          </button>
          <button
            v-if="!isResults"
            type="button"
            data-test="campaign-save-draft"
            :disabled="Boolean(busy)"
            class="px-3.5 py-2 text-sm font-semibold rounded-[10px] text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-60"
            @click="saveDraft"
          >
            {{
              busy === 'draft'
                ? t('KALO_CAMPAIGN_FLOW.WIZARD.SAVING')
                : t('KALO_CAMPAIGN_FLOW.WIZARD.SAVE_DRAFT')
            }}
          </button>
        </div>
        <button
          v-if="!isResults"
          type="button"
          data-test="campaign-next"
          :disabled="Boolean(busy)"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-60"
          @click="next"
        >
          <KaloIcon v-if="step === 'REVIEW'" name="send" class="size-4" />
          {{ primaryLabel }}
        </button>
        <button
          v-else
          type="button"
          data-test="campaign-done"
          class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
          @click="emit('close')"
        >
          {{ t('KALO_CAMPAIGN_FLOW.WIZARD.DONE') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
