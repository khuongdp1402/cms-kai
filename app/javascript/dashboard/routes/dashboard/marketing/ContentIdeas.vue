<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { isAdmin } = useAdmin();

const CALENDAR_CHANNELS = [
  'tiktok',
  'facebook',
  'instagram',
  'zalo',
  'website',
];
const INPUT_CLASS =
  'px-3 py-2 mb-0 text-sm font-normal border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500';
const SELECT_CLASS =
  'px-3 py-2 pr-8 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 bg-origin-padding !bg-[position:right_0.75rem_center] focus:border-woot-500';

const todayIso = () => new Date().toISOString().slice(0, 10);

const topic = ref('');
const topicInput = ref(null);
const jobs = ref([]);
const activeJobId = ref(null);
const filterMode = ref('all');
const decisions = ref({});
const pending = ref({});
const copiedKey = ref('');
const editingKey = ref('');
const editForm = ref({ hook: '', body: '', cta: '' });
const isSavingEdit = ref(false);
const schedulingKey = ref('');
const scheduleForm = ref({
  scheduled_for: todayIso(),
  channel: 'tiktok',
  campaign_tag: '',
});
const isSavingSchedule = ref(false);
const isLoading = ref(false);
const isLoadingHistory = ref(true);
const notice = ref('');
const needsRenewal = ref(false);
// `ai` from the overview (configured/available). Unknown (no answer yet or
// overview failed) keeps the button usable; a known "no" disables it.
const aiStatus = ref(null);
const isAiUnavailable = computed(
  () =>
    !!aiStatus.value &&
    (!aiStatus.value.configured || aiStatus.value.available === false)
);

const currentJob = computed(
  () =>
    jobs.value.find(item => item.id === activeJobId.value) ||
    jobs.value[0] ||
    null
);

const decisionKey = (jobId, index) => `${jobId}:${index}`;

const angleDecision = (item, jobId, index) => {
  const local = decisions.value[decisionKey(jobId, index)];
  if (local) return local;
  if (item.status === 'approved') return 'approve';
  if (item.status === 'rejected') return 'reject';
  return null;
};

const angleEntries = computed(() => {
  if (!currentJob.value) return [];
  return (currentJob.value.angles || []).map((item, index) => ({
    item,
    index,
    decision: angleDecision(item, currentJob.value.id, index),
  }));
});

const approvedCount = computed(
  () => angleEntries.value.filter(entry => entry.decision === 'approve').length
);

const visibleAngles = computed(() =>
  filterMode.value === 'approved'
    ? angleEntries.value.filter(entry => entry.decision === 'approve')
    : angleEntries.value
);

const explainError = error => {
  const status = error?.response?.status;
  const code = error?.response?.data?.error;
  if (status === 503 && code === 'ai_not_configured') {
    return 'KALO_MARKETING.IDEAS.AI_OFF';
  }
  if (status === 403 && code === 'subscription_expired') {
    needsRenewal.value = true;
    return 'KALO_MARKETING.IDEAS.EXPIRED';
  }
  return null;
};

const loadHistory = async () => {
  if (typeof contentIdeasAPI.overview !== 'function') {
    isLoadingHistory.value = false;
    return;
  }
  try {
    const { data } = await contentIdeasAPI.overview();
    aiStatus.value = data?.ai || null;
    if (Array.isArray(data?.jobs) && data.jobs.length) {
      jobs.value = data.jobs;
      activeJobId.value = data.jobs[0].id;
    }
  } catch {
    // Keep silent if history fails to load so the generator stays usable.
  } finally {
    isLoadingHistory.value = false;
  }
};

const submit = async () => {
  if (!topic.value.trim() || isAiUnavailable.value) return;
  isLoading.value = true;
  notice.value = '';
  needsRenewal.value = false;
  try {
    const { data } = await contentIdeasAPI.repurpose(topic.value.trim());
    jobs.value = [
      data,
      ...jobs.value.filter(item => item.id !== data.id),
    ].slice(0, 20);
    activeJobId.value = data.id;
    filterMode.value = 'all';
    pending.value = {};
  } catch (error) {
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.ERROR';
  } finally {
    isLoading.value = false;
  }
};

const decide = async (index, action) => {
  if (!currentJob.value) return;
  const jobId = currentJob.value.id;
  const key = decisionKey(jobId, index);
  if (pending.value[key]) return;
  notice.value = '';
  pending.value = { ...pending.value, [key]: true };
  try {
    const response = await contentIdeasAPI.decide(jobId, action, index);
    decisions.value = { ...decisions.value, [key]: action };
    if (response?.data?.angles) {
      jobs.value = jobs.value.map(item =>
        item.id === jobId ? response.data : item
      );
    }
  } catch (error) {
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.DECIDE_ERROR';
  } finally {
    pending.value = { ...pending.value, [key]: false };
  }
};

const copyAngle = async (item, index) => {
  if (!currentJob.value) return;
  const key = decisionKey(currentJob.value.id, index);
  const scriptText = [item.hook, item.body, item.cta]
    .filter(Boolean)
    .join('\n\n');
  try {
    await navigator.clipboard?.writeText(scriptText);
    copiedKey.value = key;
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = '';
    }, 2000);
  } catch {
    // Clipboard blocked in non-HTTPS contexts; ignore silently.
  }
};

const startEdit = (item, index) => {
  if (!currentJob.value) return;
  editingKey.value = decisionKey(currentJob.value.id, index);
  schedulingKey.value = '';
  editForm.value = {
    hook: item.hook || '',
    body: item.body || '',
    cta: item.cta || '',
  };
};

const saveEdit = async index => {
  if (!currentJob.value || typeof contentIdeasAPI.updateAngle !== 'function') {
    return;
  }
  const jobId = currentJob.value.id;
  isSavingEdit.value = true;
  try {
    const response = await contentIdeasAPI.updateAngle(
      jobId,
      index,
      editForm.value
    );
    if (response?.data?.angles) {
      jobs.value = jobs.value.map(item =>
        item.id === jobId ? response.data : item
      );
    }
    editingKey.value = '';
    useAlert(t('KALO_MARKETING.IDEAS.ANGLE_SAVED'));
  } catch (error) {
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.DECIDE_ERROR';
  } finally {
    isSavingEdit.value = false;
  }
};

const startSchedule = index => {
  if (!currentJob.value) return;
  schedulingKey.value = decisionKey(currentJob.value.id, index);
  editingKey.value = '';
  scheduleForm.value = {
    scheduled_for: todayIso(),
    channel: 'tiktok',
    campaign_tag: '',
  };
};

const saveSchedule = async (item, index) => {
  if (
    !currentJob.value ||
    typeof contentIdeasAPI.saveCalendarItem !== 'function'
  ) {
    return;
  }
  isSavingSchedule.value = true;
  try {
    await contentIdeasAPI.saveCalendarItem({
      title: `${currentJob.value.topic} — ${item.angle || index + 1}`,
      channel: scheduleForm.value.channel,
      status: 'scheduled',
      scheduled_for: scheduleForm.value.scheduled_for,
      campaign_tag: scheduleForm.value.campaign_tag,
      hook: item.hook,
      body: item.body,
      cta: item.cta,
      source_job_id: currentJob.value.id,
    });
    schedulingKey.value = '';
    useAlert(t('KALO_MARKETING.IDEAS.SCHEDULED_OK'));
  } catch (error) {
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.DECIDE_ERROR';
  } finally {
    isSavingSchedule.value = false;
  }
};

onMounted(loadHistory);
</script>

<template>
  <div class="flex flex-col max-w-3xl gap-4">
    <form class="flex flex-wrap items-end gap-3" @submit.prevent="submit">
      <label
        class="flex flex-col flex-1 gap-1 text-sm font-semibold text-n-slate-12 min-w-60"
      >
        {{ t('KALO_MARKETING.IDEAS.TOPIC_LABEL') }}
        <input
          ref="topicInput"
          v-model="topic"
          type="text"
          :placeholder="t('KALO_MARKETING.IDEAS.TOPIC_PLACEHOLDER')"
          class="px-3 py-2 mb-0 text-sm font-normal border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500"
        />
      </label>
      <Button
        type="submit"
        data-test="ideas-submit"
        :label="t('KALO_MARKETING.IDEAS.SUBMIT')"
        :is-loading="isLoading"
        :disabled="isAiUnavailable"
      />
    </form>
    <p
      v-if="isAiUnavailable"
      data-test="ideas-ai-unavailable"
      class="mb-0 text-sm text-n-slate-11"
    >
      {{
        aiStatus.configured
          ? t('KALO_POLISH4.AI.IDEAS_UNAVAILABLE')
          : t('KALO_POLISH4.AI.IDEAS_OFF')
      }}
    </p>

    <div
      v-if="notice"
      data-test="notice"
      class="flex flex-wrap items-center gap-3 text-sm text-n-slate-11"
    >
      <span>{{ t(notice) }}</span>
      <router-link
        v-if="needsRenewal && isAdmin"
        data-test="renew-link"
        :to="accountScopedRoute('kalo_billing')"
        class="font-semibold text-n-brand"
      >
        {{ t('KALO_MARKETING.IDEAS.RENEW') }}
      </router-link>
      <span v-else-if="needsRenewal" data-test="renew-ask-admin">
        {{ t('KALO_MARKETING.IDEAS.ASK_ADMIN') }}
      </span>
    </div>

    <div v-if="jobs.length > 1" class="flex flex-col gap-2">
      <span class="text-xs font-semibold text-n-slate-11">
        {{ t('KALO_MARKETING.IDEAS.HISTORY_TITLE') }}
      </span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in jobs"
          :key="item.id"
          type="button"
          data-test="history-topic"
          class="px-3 py-1 text-xs font-medium truncate border rounded-full max-w-52"
          :class="
            currentJob?.id === item.id
              ? 'bg-n-slate-12 text-n-solid-1 border-n-slate-12'
              : 'bg-n-solid-1 text-n-slate-11 border-n-weak hover:bg-n-alpha-2'
          "
          @click="activeJobId = item.id"
        >
          {{ item.topic }}
        </button>
      </div>
    </div>

    <div v-if="currentJob" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-test="filter-all"
        class="px-3 py-1 text-xs font-semibold rounded-full"
        :class="
          filterMode === 'all'
            ? 'bg-n-blue-3 text-n-blue-11'
            : 'bg-n-alpha-2 text-n-slate-11 hover:text-n-slate-12'
        "
        @click="filterMode = 'all'"
      >
        {{
          t('KALO_MARKETING.IDEAS.FILTER_ALL', {
            n: angleEntries.length,
          })
        }}
      </button>
      <button
        type="button"
        data-test="filter-approved"
        class="px-3 py-1 text-xs font-semibold rounded-full"
        :class="
          filterMode === 'approved'
            ? 'bg-n-blue-3 text-n-blue-11'
            : 'bg-n-alpha-2 text-n-slate-11 hover:text-n-slate-12'
        "
        @click="filterMode = 'approved'"
      >
        {{
          t('KALO_MARKETING.IDEAS.FILTER_APPROVED', {
            n: approvedCount,
          })
        }}
      </button>
    </div>

    <div
      v-if="
        !currentJob &&
        !isLoading &&
        !isLoadingHistory &&
        !notice &&
        !isAiUnavailable
      "
      data-test="ideas-empty"
      class="flex flex-col items-start gap-3"
    >
      <p class="mb-0 text-sm text-n-slate-11">
        {{ t('KALO_GUIDE.EMPTY.IDEAS') }}
      </p>
      <Button
        data-test="ideas-empty-action"
        variant="faded"
        color="slate"
        size="sm"
        :label="t('KALO_GUIDE.EMPTY.IDEAS_ACTION')"
        @click="topicInput?.focus()"
      />
    </div>

    <ul v-if="currentJob" class="flex flex-col gap-3 list-none">
      <li
        v-for="{ item, index, decision } in visibleAngles"
        :key="`${currentJob.id}-${index}`"
        data-test="angle"
        class="flex flex-col gap-2 p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h3 class="text-sm font-bold text-n-slate-12">
            {{
              t('KALO_MARKETING.IDEAS.ANGLE_TITLE', {
                index: index + 1,
                angle: item.angle,
              })
            }}
          </h3>
          <div class="flex flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              data-test="edit-angle"
              class="px-2.5 py-1 text-xs font-semibold border rounded-lg border-n-weak text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="startEdit(item, index)"
            >
              {{ t('KALO_MARKETING.IDEAS.EDIT') }}
            </button>
            <button
              type="button"
              data-test="schedule-angle"
              class="px-2.5 py-1 text-xs font-semibold border rounded-lg border-n-weak text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="startSchedule(index)"
            >
              {{ t('KALO_MARKETING.IDEAS.SCHEDULE') }}
            </button>
            <button
              type="button"
              data-test="copy-angle"
              class="px-2.5 py-1 text-xs font-semibold border rounded-lg border-n-weak text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="copyAngle(item, index)"
            >
              {{
                copiedKey === decisionKey(currentJob.id, index)
                  ? t('KALO_MARKETING.IDEAS.COPIED')
                  : t('KALO_MARKETING.IDEAS.COPY')
              }}
            </button>
          </div>
        </div>
        <div
          v-if="editingKey === decisionKey(currentJob.id, index)"
          data-test="edit-angle-form"
          class="flex flex-col gap-2 p-3 border rounded-xl bg-n-alpha-1 border-n-weak"
        >
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_MARKETING.IDEAS.HOOK_LABEL') }}
            <input
              v-model="editForm.hook"
              data-test="edit-hook-input"
              type="text"
              :class="INPUT_CLASS"
            />
          </label>
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_MARKETING.IDEAS.BODY_LABEL') }}
            <textarea
              v-model="editForm.body"
              data-test="edit-body-input"
              rows="3"
              :class="INPUT_CLASS"
            />
          </label>
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_MARKETING.IDEAS.CTA_LABEL') }}
            <input
              v-model="editForm.cta"
              data-test="edit-cta-input"
              type="text"
              :class="INPUT_CLASS"
            />
          </label>
          <div class="flex gap-2">
            <Button
              type="button"
              data-test="save-angle-edit"
              size="sm"
              :is-loading="isSavingEdit"
              :label="t('KALO_MARKETING.IDEAS.SAVE_EDIT')"
              @click="saveEdit(index)"
            />
            <Button
              type="button"
              size="sm"
              variant="faded"
              color="slate"
              :label="t('KALO_MARKETING.IDEAS.CANCEL_EDIT')"
              @click="editingKey = ''"
            />
          </div>
        </div>
        <template v-else>
          <p class="mb-0 text-base font-semibold text-n-slate-12">
            {{ item.hook }}
          </p>
          <p class="mb-0 text-sm whitespace-pre-line text-n-slate-11">
            {{ item.body }}
          </p>
          <p class="mb-0 text-sm font-semibold text-n-slate-12">
            {{ item.cta }}
          </p>
        </template>
        <div
          v-if="schedulingKey === decisionKey(currentJob.id, index)"
          data-test="schedule-angle-form"
          class="flex flex-wrap items-end gap-2 p-3 border rounded-xl bg-n-alpha-1 border-n-weak"
        >
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_MARKETING.IDEAS.SCHEDULE_DATE') }}
            <input
              v-model="scheduleForm.scheduled_for"
              data-test="schedule-date-input"
              type="date"
              :class="INPUT_CLASS"
            />
          </label>
          <label
            class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
          >
            {{ t('KALO_MARKETING.CALENDAR.CHANNEL') }}
            <select
              v-model="scheduleForm.channel"
              data-test="schedule-channel-select"
              :class="SELECT_CLASS"
            >
              <option v-for="ch in CALENDAR_CHANNELS" :key="ch" :value="ch">
                {{ t(`KALO_MARKETING.CALENDAR.CHANNELS.${ch}`) }}
              </option>
            </select>
          </label>
          <label
            class="flex flex-col flex-1 gap-1 text-xs font-semibold text-n-slate-12 min-w-36"
          >
            {{ t('KALO_MARKETING.CALENDAR.CAMPAIGN_TAG') }}
            <input
              v-model="scheduleForm.campaign_tag"
              type="text"
              :placeholder="
                t('KALO_MARKETING.CALENDAR.CAMPAIGN_TAG_PLACEHOLDER')
              "
              :class="INPUT_CLASS"
            />
          </label>
          <Button
            type="button"
            data-test="confirm-schedule-angle"
            size="sm"
            :is-loading="isSavingSchedule"
            :label="t('KALO_MARKETING.IDEAS.SCHEDULE_SUBMIT')"
            @click="saveSchedule(item, index)"
          />
          <Button
            type="button"
            size="sm"
            variant="faded"
            color="slate"
            :label="t('KALO_MARKETING.IDEAS.CANCEL_EDIT')"
            @click="schedulingKey = ''"
          />
        </div>
        <p
          v-if="decision"
          class="mb-0 text-sm font-semibold"
          :class="decision === 'approve' ? 'text-n-teal-11' : 'text-n-slate-11'"
        >
          {{
            decision === 'approve'
              ? t('KALO_MARKETING.IDEAS.APPROVED')
              : t('KALO_MARKETING.IDEAS.REJECTED')
          }}
        </p>
        <div v-else class="flex gap-2 pt-1">
          <Button
            :label="t('KALO_MARKETING.IDEAS.APPROVE')"
            size="sm"
            :disabled="pending[decisionKey(currentJob.id, index)]"
            @click="decide(index, 'approve')"
          />
          <Button
            :label="t('KALO_MARKETING.IDEAS.REJECT')"
            size="sm"
            variant="faded"
            color="slate"
            :disabled="pending[decisionKey(currentJob.id, index)]"
            @click="decide(index, 'reject')"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
