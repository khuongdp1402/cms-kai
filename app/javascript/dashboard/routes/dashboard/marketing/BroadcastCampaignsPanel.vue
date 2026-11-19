<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useMapGetter } from 'dashboard/composables/store';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { isAdmin } = useAdmin();

const inboxes = useMapGetter('inboxes/getInboxes');
const labels = useMapGetter('labels/getLabels');

const SELECT_CLASS =
  'px-3 py-2 pr-8 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 bg-origin-padding !bg-[position:right_0.75rem_center] focus:border-woot-500';
const INPUT_CLASS =
  'px-3 py-2 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500';

const selectableInboxes = computed(() =>
  (inboxes.value || []).filter(inbox => inbox.channel_type !== 'Channel::Voice')
);
const availableLabels = computed(() =>
  (labels.value || []).map(l => l.title).filter(Boolean)
);

const broadcasts = ref([]);
const showForm = ref(false);
const title = ref('');
const inboxId = ref('');
const selectedLabels = ref([]);
const campaignTag = ref('');
const message = ref('');
const scheduledAt = ref('');
const only24h = ref(false);

const preview = ref(null);
const isPreviewLoading = ref(false);
const isSubmitting = ref(false);
const errorKey = ref('');
const errorText = ref('');
const needsRenewal = ref(false);

const templateHint = computed(() =>
  t('KALO_MARKETING.BROADCASTS.VARS_HINT', {
    vars: '{{name}}, {{shop_name}}',
  })
);

let previewReq = 0;

const refreshPreview = async () => {
  if (!showForm.value || !inboxId.value) return;
  if (typeof broadcastsAPI.preview !== 'function') return;
  previewReq += 1;
  const mine = previewReq;
  isPreviewLoading.value = true;
  try {
    const { data } = await broadcastsAPI.preview({
      inbox_id: inboxId.value,
      labels: selectedLabels.value.join(','),
      only_24h: only24h.value,
    });
    if (mine === previewReq) preview.value = data;
  } catch {
    if (mine === previewReq) preview.value = null;
  } finally {
    if (mine === previewReq) isPreviewLoading.value = false;
  }
};

watch(selectableInboxes, list => {
  if (!inboxId.value && list.length) {
    inboxId.value = list[0].id;
  }
});

watch([showForm, inboxId, selectedLabels, only24h], refreshPreview, {
  deep: true,
});

const loadBroadcasts = async () => {
  if (typeof broadcastsAPI.list !== 'function') return;
  try {
    const { data } = await broadcastsAPI.list();
    // Drafts belong to the Chiến dịch wizard; this older panel lists sent and scheduled ones.
    broadcasts.value = (
      Array.isArray(data?.broadcasts) ? data.broadcasts : []
    ).filter(item => item.status !== 'draft');
  } catch {
    // Stay quiet if list fails on initial load.
  }
};

const toggleLabel = label => {
  if (selectedLabels.value.includes(label)) {
    selectedLabels.value = selectedLabels.value.filter(item => item !== label);
  } else {
    selectedLabels.value = [...selectedLabels.value, label];
  }
};

const resetForm = () => {
  title.value = '';
  campaignTag.value = '';
  message.value = '';
  scheduledAt.value = '';
  selectedLabels.value = [];
  only24h.value = false;
};

const submit = async () => {
  if (!isAdmin.value || !title.value.trim() || !message.value.trim()) return;
  if (!inboxId.value) return;
  isSubmitting.value = true;
  errorKey.value = '';
  errorText.value = '';
  needsRenewal.value = false;
  try {
    const { data } = await broadcastsAPI.create({
      title: title.value.trim(),
      inbox_id: inboxId.value,
      labels: selectedLabels.value,
      campaign_tag: campaignTag.value.trim() || undefined,
      message: message.value.trim(),
      scheduled_at: scheduledAt.value || undefined,
      only_24h: only24h.value,
    });
    if (data?.broadcast) {
      broadcasts.value = [data.broadcast, ...broadcasts.value].slice(0, 30);
    }
    useAlert(t('KALO_MARKETING.BROADCASTS.SENT_OK'));
    resetForm();
    showForm.value = false;
  } catch (error) {
    const status = error?.response?.status;
    const code = error?.response?.data?.error;
    if (status === 403 && code === 'subscription_expired') {
      needsRenewal.value = true;
      errorKey.value = 'KALO_MARKETING.BROADCASTS.EXPIRED';
    } else if (code) {
      errorText.value = code;
    } else {
      errorKey.value = 'KALO_MARKETING.BROADCASTS.ERROR';
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  if (selectableInboxes.value.length && !inboxId.value) {
    inboxId.value = selectableInboxes.value[0].id;
  }
  loadBroadcasts();
});
</script>

<template>
  <div class="p-4 border rounded-2xl bg-n-solid-1 border-n-weak">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_MARKETING.BROADCASTS.TITLE') }}
        </h2>
        <p class="mt-0.5 text-sm text-n-slate-11">
          {{ t('KALO_MARKETING.BROADCASTS.DESC') }}
        </p>
      </div>
      <Button
        v-if="isAdmin"
        data-test="broadcast-toggle"
        :variant="showForm ? 'faded' : 'solid'"
        :color="showForm ? 'slate' : 'blue'"
        size="sm"
        :label="
          showForm
            ? t('KALO_MARKETING.BROADCASTS.CANCEL')
            : t('KALO_MARKETING.BROADCASTS.CREATE')
        "
        @click="showForm = !showForm"
      />
    </div>

    <router-link
      data-test="broadcast-open-campaigns"
      :to="accountScopedRoute('kalo_campaigns')"
      class="inline-block mt-2 text-xs font-semibold underline text-n-brand"
    >
      {{ t('KALO_MARKETING.BROADCASTS.OPEN_CAMPAIGNS') }}
    </router-link>
    <p v-if="!isAdmin" class="mt-2 text-xs text-n-slate-11">
      {{ t('KALO_MARKETING.BROADCASTS.READONLY_NOTE') }}
    </p>

    <form
      v-if="showForm && isAdmin"
      data-test="broadcast-form"
      class="flex flex-col gap-3 pt-4 mt-4 border-t border-n-weak"
      @submit.prevent="submit"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BROADCASTS.TITLE_FIELD') }}
          <input
            v-model="title"
            data-test="broadcast-title"
            type="text"
            :placeholder="t('KALO_MARKETING.BROADCASTS.TITLE_PLACEHOLDER')"
            :class="INPUT_CLASS"
          />
        </label>
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BROADCASTS.INBOX') }}
          <select
            v-model="inboxId"
            data-test="broadcast-inbox"
            :class="SELECT_CLASS"
          >
            <option
              v-for="inbox in selectableInboxes"
              :key="inbox.id"
              :value="inbox.id"
            >
              {{ inbox.name }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="availableLabels.length" class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold text-n-slate-12">
          {{ t('KALO_MARKETING.BROADCASTS.LABELS') }}
        </span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="label in availableLabels"
            :key="label"
            type="button"
            data-test="broadcast-label"
            class="px-2.5 py-1 text-xs font-semibold border rounded-full"
            :class="
              selectedLabels.includes(label)
                ? 'bg-n-brand text-white border-n-brand'
                : 'bg-n-alpha-1 text-n-slate-11 border-n-weak hover:text-n-slate-12'
            "
            @click="toggleLabel(label)"
          >
            {{ label }}
          </button>
        </div>
        <span class="text-xs text-n-slate-11">
          {{ t('KALO_MARKETING.BROADCASTS.LABELS_HINT') }}
        </span>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BROADCASTS.CAMPAIGN_TAG') }}
          <input
            v-model="campaignTag"
            data-test="broadcast-tag"
            type="text"
            :placeholder="
              t('KALO_MARKETING.BROADCASTS.CAMPAIGN_TAG_PLACEHOLDER')
            "
            :class="INPUT_CLASS"
          />
        </label>
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BROADCASTS.SCHEDULED_AT') }}
          <input
            v-model="scheduledAt"
            type="datetime-local"
            :class="INPUT_CLASS"
          />
        </label>
      </div>

      <label class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.BROADCASTS.MESSAGE') }}
        <textarea
          v-model="message"
          data-test="broadcast-message"
          rows="3"
          :placeholder="t('KALO_MARKETING.BROADCASTS.MESSAGE_PLACEHOLDER')"
          :class="INPUT_CLASS"
        />
        <span class="text-xs font-normal text-n-slate-11">
          {{ templateHint }}
        </span>
      </label>

      <label class="inline-flex items-center gap-2 text-xs text-n-slate-12">
        <input v-model="only24h" type="checkbox" class="mb-0" />
        {{ t('KALO_MARKETING.BROADCASTS.ONLY_24H') }}
      </label>

      <div
        v-if="isPreviewLoading"
        class="px-3 py-2 text-xs rounded-lg bg-n-alpha-1 text-n-slate-11"
      >
        {{ t('KALO_MARKETING.BROADCASTS.PREVIEW_LOADING') }}
      </div>
      <div
        v-else-if="preview"
        data-test="broadcast-preview"
        class="flex flex-col gap-1 px-3 py-2 text-xs border rounded-lg bg-n-alpha-1 border-n-weak text-n-slate-12"
      >
        <span class="font-semibold">
          {{
            t('KALO_MARKETING.BROADCASTS.ELIGIBLE', {
              count: preview.eligible_count,
            })
          }}
        </span>
        <span
          v-if="preview.requires_24h_window"
          class="text-n-amber-11 font-medium"
        >
          {{
            t('KALO_MARKETING.BROADCASTS.META_24H_WARNING', {
              skipped: preview.skipped_24h_count,
            })
          }}
        </span>
      </div>

      <p
        v-if="errorKey || errorText"
        data-test="broadcast-error"
        class="text-xs font-medium text-n-ruby-11"
      >
        {{ errorKey ? t(errorKey) : errorText }}
        <router-link
          v-if="needsRenewal"
          :to="accountScopedRoute('kalo_billing')"
          class="ml-1 font-semibold underline text-n-brand"
        >
          {{ t('KALO_MARKETING.IDEAS.RENEW') }}
        </router-link>
      </p>

      <div class="flex justify-end">
        <Button
          type="submit"
          data-test="broadcast-submit"
          :disabled="isSubmitting"
          :is-loading="isSubmitting"
          :label="
            isSubmitting
              ? t('KALO_MARKETING.BROADCASTS.SUBMITTING')
              : t('KALO_MARKETING.BROADCASTS.SUBMIT')
          "
        />
      </div>
    </form>

    <div v-if="broadcasts.length" class="flex flex-col gap-2 mt-4">
      <div
        v-for="item in broadcasts"
        :key="item.id"
        data-test="broadcast-item"
        class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm border rounded-xl border-n-weak bg-n-surface-1"
      >
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="font-bold text-n-slate-12">{{ item.title }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full bg-n-alpha-2 text-n-slate-11"
            >
              {{ item.inbox_name }}
            </span>
            <span
              v-if="item.campaign_tag"
              class="text-xs px-2 py-0.5 rounded-full bg-n-alpha-2 text-n-slate-11"
            >
              #{{ item.campaign_tag }}
            </span>
          </div>
          <span class="mt-0.5 text-xs text-n-slate-11">
            {{
              t('KALO_MARKETING.BROADCASTS.STATS', {
                sent: item.sent_count || 0,
                eligible: item.eligible_count || 0,
                skipped: item.skipped_24h_count || 0,
              })
            }}
          </span>
        </div>
        <span
          class="px-2.5 py-1 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-slate-12"
        >
          {{
            t(`KALO_MARKETING.BROADCASTS.STATUS.${item.status || 'completed'}`)
          }}
        </span>
      </div>
    </div>
    <p v-else-if="!showForm" class="mt-3 text-xs text-n-slate-11">
      {{ t('KALO_MARKETING.BROADCASTS.EMPTY') }}
    </p>
  </div>
</template>
