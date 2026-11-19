<script setup>
import { computed, inject, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import {
  CAMPAIGN_FLOW_KEY,
  MAX_MESSAGE_CHARS,
  aiPrompt,
  buildUtmLink,
  campaignTagFrom,
  channelKey,
  personalize,
} from './campaignFlowHelpers';

const { t } = useI18n();
const flow = inject(CAMPAIGN_FLOW_KEY);
const campaign = flow.campaign;

const textareaRef = ref(null);
const isWriting = ref(false);
const aiErrorKey = ref('');
const aiGuardrail = ref(false);
const utmUrl = ref('');

const INPUT_CLASS =
  'w-full px-3 py-2 mb-0 text-sm font-normal border rounded-[10px] outline-none bg-n-solid-1 border-n-strong text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15';

const VARIABLES = [
  { token: '{{name}}', labelKey: 'VAR_NAME' },
  { token: '{{shop_name}}', labelKey: 'VAR_SHOP' },
];

const previewText = computed(() =>
  personalize(campaign.message.trim(), {
    name: t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.PREVIEW_NAME'),
    shopName: flow.shopName.value,
  })
);

// One bubble per channel type the audience can be reached on.
const previewChannels = computed(() => {
  const types = (flow.audience.value?.channels || [])
    .filter(row => row.eligible_count > 0)
    .map(row => channelKey(row.channel_type));
  return [...new Set(types)].slice(0, 3);
});

const BUBBLE_TONES = {
  zalo_personal: 'bg-[#0068FF] text-white',
  facebook_page: 'bg-[#0084FF] text-white',
  instagram: 'bg-[#8a3ab9] text-white',
};
const bubbleTone = key => BUBBLE_TONES[key] || 'bg-n-slate-12 text-n-solid-1';

const utmLink = computed(() =>
  buildUtmLink(utmUrl.value, campaignTagFrom(campaign.title))
);

const insertAtCursor = text => {
  const el = textareaRef.value;
  const value = campaign.message;
  const start = el ? el.selectionStart : value.length;
  const end = el ? el.selectionEnd : value.length;
  campaign.message = `${value.slice(0, start)}${text}${value.slice(end)}`;
  nextTick(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(start + text.length, start + text.length);
  });
};

const insertLink = () => {
  if (!utmLink.value) return;
  const sep = campaign.message && !/\s$/.test(campaign.message) ? '\n' : '';
  campaign.message = `${campaign.message}${sep}${utmLink.value}`;
};

const AI_ERRORS = {
  403: 'AI_EXPIRED',
  429: 'AI_RATE_LIMITED',
};

const writeWithAi = async () => {
  isWriting.value = true;
  aiErrorKey.value = '';
  aiGuardrail.value = false;
  try {
    const { data } = await brandGrowthAPI.chatReply({
      message: aiPrompt({
        goalLabel: campaign.goal
          ? t(`KALO_CAMPAIGN_FLOW.GOALS.${campaign.goal}`)
          : '',
        title: campaign.title.trim(),
        shopName: flow.shopName.value,
      }),
      history: [],
    });
    const reply = String(data?.reply || '').trim();
    if (!reply) throw new Error('empty');
    campaign.message = reply.slice(0, MAX_MESSAGE_CHARS);
    aiGuardrail.value = Boolean(data?.guardrail_triggered);
    flow.blockedPhrases.value = [];
  } catch (error) {
    aiErrorKey.value = AI_ERRORS[error?.response?.status] || 'AI_UNAVAILABLE';
  } finally {
    isWriting.value = false;
  }
};

const onInput = () => {
  flow.blockedPhrases.value = [];
};
</script>

<template>
  <div
    class="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_240px]"
    data-test="campaign-step-content"
  >
    <div class="flex flex-col gap-4 min-w-0">
      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label
            for="kalo-campaign-message"
            class="text-sm font-semibold text-n-slate-12"
          >
            {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.MESSAGE') }}
          </label>
          <button
            v-if="flow.aiAvailable.value"
            type="button"
            data-test="campaign-ai-write"
            :disabled="isWriting"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[9px] bg-woot-50 text-woot-600 dark:bg-n-blue-3 dark:text-n-blue-11 hover:bg-woot-75 disabled:opacity-60"
            @click="writeWithAi"
          >
            <KaloIcon name="spark" class="size-3.5" />
            {{
              isWriting
                ? t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.AI_WRITING')
                : t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.AI_WRITE')
            }}
          </button>
        </div>
        <textarea
          id="kalo-campaign-message"
          ref="textareaRef"
          v-model="campaign.message"
          data-test="campaign-message"
          rows="6"
          :maxlength="MAX_MESSAGE_CHARS"
          :placeholder="t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.PLACEHOLDER')"
          :class="INPUT_CLASS"
          @input="onInput"
        />
        <div
          class="flex flex-wrap items-center justify-between gap-2 text-xs text-n-slate-11"
        >
          <span class="flex flex-wrap items-center gap-1.5">
            {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.VARIABLES') }}
            <button
              v-for="variable in VARIABLES"
              :key="variable.token"
              type="button"
              data-test="campaign-variable"
              class="px-2 py-0.5 font-semibold border rounded-full border-n-weak bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-2"
              @click="insertAtCursor(variable.token)"
            >
              {{ t(`KALO_CAMPAIGN_FLOW.CONTENT_STEP.${variable.labelKey}`) }}
            </button>
          </span>
          <span class="tabular-nums">
            {{
              t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.COUNTER', {
                count: campaign.message.length,
                max: MAX_MESSAGE_CHARS,
              })
            }}
          </span>
        </div>
        <p v-if="flow.aiAvailable.value" class="text-xs text-n-slate-11">
          {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.AI_HINT') }}
        </p>
        <p
          v-if="aiErrorKey"
          data-test="campaign-ai-error"
          class="text-xs font-medium text-n-ruby-11"
        >
          {{ t(`KALO_CAMPAIGN_FLOW.ERRORS.${aiErrorKey}`) }}
        </p>
        <p
          v-if="aiGuardrail"
          data-test="campaign-ai-guardrail"
          class="text-xs font-medium text-n-amber-11"
        >
          {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.AI_GUARDRAIL') }}
        </p>
        <p
          v-if="flow.blockedPhrases.value.length"
          data-test="campaign-banned"
          role="alert"
          class="px-3 py-2 text-sm font-medium rounded-lg bg-n-ruby-3 text-n-ruby-11"
        >
          {{
            t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.BANNED', {
              phrases: flow.blockedPhrases.value.join(', '),
            })
          }}
        </p>
      </div>

      <details class="p-3 border rounded-xl border-n-weak bg-n-solid-2 group">
        <summary
          class="text-sm font-semibold cursor-pointer text-n-slate-12 marker:text-n-slate-10"
        >
          {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_TITLE') }}
        </summary>
        <div class="flex flex-col gap-2 mt-3">
          <p class="text-xs text-n-slate-11">
            {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_DESC') }}
          </p>
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_URL') }}
            <input
              v-model="utmUrl"
              data-test="campaign-utm-url"
              type="text"
              inputmode="url"
              :placeholder="
                t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_URL_PLACEHOLDER')
              "
              :class="INPUT_CLASS"
            />
          </label>
          <p
            v-if="utmUrl.trim() && !utmLink"
            class="text-xs font-medium text-n-ruby-11"
          >
            {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_INVALID') }}
          </p>
          <div v-if="utmLink" class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-n-slate-12">
              {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_RESULT') }}
            </span>
            <code
              data-test="campaign-utm-link"
              class="px-2 py-1.5 text-xs break-all rounded-lg bg-n-solid-1 text-n-slate-12 border border-n-weak"
            >
              {{ utmLink }}
            </code>
            <button
              type="button"
              data-test="campaign-utm-insert"
              class="self-start px-3 py-1.5 text-xs font-semibold border rounded-[9px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3"
              @click="insertLink"
            >
              {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.UTM_INSERT') }}
            </button>
          </div>
        </div>
      </details>
    </div>

    <aside class="flex flex-col min-w-0 gap-3" data-test="campaign-preview">
      <span
        class="text-xs font-semibold tracking-wide uppercase text-n-slate-10"
      >
        {{ t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.PREVIEW') }}
      </span>
      <div
        v-for="key in previewChannels.length ? previewChannels : ['other']"
        :key="key"
        data-test="campaign-preview-bubble"
        class="flex flex-col gap-1.5 p-3 border rounded-xl border-n-weak bg-n-solid-2"
      >
        <span class="text-xs font-semibold text-n-slate-11">
          {{ t(`KALO_CAMPAIGN_FLOW.CHANNELS.${key}`) }}
        </span>
        <p
          class="self-end max-w-full px-3 py-2 text-sm rounded-2xl rounded-br-md whitespace-pre-wrap [overflow-wrap:anywhere]"
          :class="bubbleTone(key)"
        >
          {{
            previewText || t('KALO_CAMPAIGN_FLOW.CONTENT_STEP.PREVIEW_EMPTY')
          }}
        </p>
      </div>
    </aside>
  </div>
</template>
