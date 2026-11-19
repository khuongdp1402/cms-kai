<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import conversationAttributionAPI from 'dashboard/api/kchat/conversationAttribution';
import Button from 'dashboard/components-next/button/Button.vue';
import { formatLocalized } from 'shared/helpers/dateLocale';

const props = defineProps({
  conversation: { type: Object, default: () => ({}) },
});

const { t } = useI18n();

const INPUT_CLASS =
  'px-2.5 py-1.5 mb-0 text-xs border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500';

const isEditing = ref(false);
const isSaving = ref(false);
const localAttrs = ref(null);
const utmSource = ref('');
const utmCampaign = ref('');
const syncLabel = ref(true);

const attrs = computed(
  () => localAttrs.value || props.conversation?.additional_attributes || {}
);
const isSocialComment = computed(
  () => attrs.value?.source_type === 'social_comment'
);
const hasUtm = computed(() =>
  Boolean(attrs.value?.utm_source || attrs.value?.utm_campaign)
);

// Kalo campaign that reached this conversation (kept apart from the ad UTM).
const broadcastTag = computed(() => attrs.value?.kchat_broadcast_tag || '');
const broadcastSentAt = computed(() => {
  const at = attrs.value?.kchat_campaign_at;
  const date = at ? new Date(at) : null;
  return date && !Number.isNaN(date.getTime())
    ? formatLocalized(date, 'HH:mm dd/MM/yyyy')
    : '';
});
const hasAttribution = computed(() => hasUtm.value || !!broadcastTag.value);

const syncFormFromProps = () => {
  localAttrs.value = null;
  const current = props.conversation?.additional_attributes || {};
  utmSource.value = current.utm_source || '';
  utmCampaign.value = current.utm_campaign || '';
  isEditing.value = false;
};

watch(() => props.conversation?.id, syncFormFromProps, { immediate: true });

const openEditor = () => {
  utmSource.value = attrs.value?.utm_source || '';
  utmCampaign.value = attrs.value?.utm_campaign || '';
  isEditing.value = true;
};

const save = async () => {
  const convId = props.conversation?.id;
  if (!convId || typeof conversationAttributionAPI.update !== 'function') {
    return;
  }
  isSaving.value = true;
  try {
    const { data } = await conversationAttributionAPI.update(convId, {
      utm_source: utmSource.value.trim(),
      utm_campaign: utmCampaign.value.trim(),
      sync_label: syncLabel.value,
    });
    localAttrs.value = {
      ...attrs.value,
      utm_source: data.utm_source,
      utm_campaign: data.utm_campaign,
    };
    isEditing.value = false;
    useAlert(t('KALO_CHAT.ATTRIBUTION.SAVED'));
  } catch {
    useAlert(t('KALO_CHAT.ATTRIBUTION.SAVE_ERROR'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="flex flex-col gap-2 py-3">
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-xs font-bold tracking-wide uppercase text-n-slate-11">
        {{ t('KALO_CHAT.ATTRIBUTION.TITLE') }}
      </h4>
      <button
        type="button"
        data-test="attribution-edit-btn"
        class="text-xs font-semibold text-n-blue-11 hover:text-n-blue-12"
        @click="isEditing ? (isEditing = false) : openEditor()"
      >
        {{
          isEditing
            ? t('KALO_CHAT.ATTRIBUTION.CANCEL')
            : t('KALO_CHAT.ATTRIBUTION.EDIT')
        }}
      </button>
    </div>

    <div
      v-if="isSocialComment"
      data-test="social-comment-badge"
      class="flex flex-wrap items-center gap-1.5"
    >
      <span
        class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-slate-12"
      >
        {{
          t('KALO_CHAT.ATTRIBUTION.SOCIAL_COMMENT', {
            platform: attrs.platform || 'social',
          })
        }}
      </span>
      <span
        v-if="attrs.private_reply_sent"
        class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-teal-11"
      >
        {{ t('KALO_CHAT.ATTRIBUTION.PRIVATE_REPLY_SENT') }}
      </span>
      <a
        v-if="attrs.permalink"
        :href="attrs.permalink"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs font-semibold underline text-n-blue-11"
      >
        {{ t('KALO_CHAT.ATTRIBUTION.OPEN_POST') }}
      </a>
    </div>

    <div
      v-if="hasAttribution && !isEditing"
      data-test="utm-chips"
      class="flex flex-wrap gap-1.5 text-xs"
    >
      <span
        v-if="attrs.utm_source"
        class="px-2 py-0.5 rounded-full bg-n-alpha-2 text-n-slate-12"
      >
        {{ t('KALO_CHAT.ATTRIBUTION.SOURCE') }}:
        <strong>{{ attrs.utm_source }}</strong>
      </span>
      <span
        v-if="attrs.utm_campaign"
        class="px-2 py-0.5 rounded-full bg-n-alpha-2 text-n-slate-12"
      >
        {{ t('KALO_CHAT.ATTRIBUTION.CAMPAIGN') }}:
        <strong>{{ attrs.utm_campaign }}</strong>
      </span>
      <span
        v-if="broadcastTag"
        data-test="broadcast-chip"
        class="px-2 py-0.5 rounded-full bg-n-alpha-2 text-n-slate-12"
      >
        {{ t('KALO_CHAT.ATTRIBUTION.BROADCAST') }}:
        <strong>{{ broadcastTag }}</strong>
        <template v-if="broadcastSentAt">
          {{
            t('KALO_CHAT.ATTRIBUTION.BROADCAST_SENT_AT', {
              time: broadcastSentAt,
            })
          }}
        </template>
      </span>
    </div>
    <p
      v-else-if="!hasAttribution && !isEditing"
      class="text-xs text-n-slate-11"
    >
      {{ t('KALO_CHAT.ATTRIBUTION.EMPTY') }}
    </p>

    <form
      v-if="isEditing"
      data-test="attribution-form"
      class="flex flex-col gap-2 pt-1"
      @submit.prevent="save"
    >
      <input
        v-model="utmSource"
        data-test="utm-source-input"
        type="text"
        :placeholder="t('KALO_CHAT.ATTRIBUTION.SOURCE_PLACEHOLDER')"
        :class="INPUT_CLASS"
      />
      <input
        v-model="utmCampaign"
        data-test="utm-campaign-input"
        type="text"
        :placeholder="t('KALO_CHAT.ATTRIBUTION.CAMPAIGN_PLACEHOLDER')"
        :class="INPUT_CLASS"
      />
      <label class="inline-flex items-center gap-1.5 text-xs text-n-slate-11">
        <input v-model="syncLabel" type="checkbox" class="mb-0" />
        {{ t('KALO_CHAT.ATTRIBUTION.SYNC_LABEL') }}
      </label>
      <Button
        type="submit"
        data-test="attribution-save-btn"
        size="xs"
        :is-loading="isSaving"
        :label="t('KALO_CHAT.ATTRIBUTION.SAVE')"
      />
    </form>
  </section>
</template>
