<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();

const CHANNELS = ['facebook', 'instagram', 'tiktok', 'zalo', 'website'];
const STATUSES = ['draft', 'scheduled', 'published'];

const SELECT_CLASS =
  'px-3 py-2 pr-8 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 bg-origin-padding !bg-[position:right_0.75rem_center] focus:border-woot-500';
const INPUT_CLASS =
  'px-3 py-2 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500';

const todayIso = () => new Date().toISOString().slice(0, 10);

const items = ref([]);
const statusFilter = ref('all');
const channelFilter = ref('all');
const showAddForm = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const copiedId = ref('');

const form = ref({
  title: '',
  channel: 'tiktok',
  status: 'scheduled',
  scheduled_for: todayIso(),
  campaign_tag: '',
  hook: '',
  body: '',
  cta: '',
});

const visibleItems = computed(() =>
  items.value.filter(item => {
    const matchStatus =
      statusFilter.value === 'all' || item.status === statusFilter.value;
    const matchChannel =
      channelFilter.value === 'all' || item.channel === channelFilter.value;
    return matchStatus && matchChannel;
  })
);

const loadCalendar = async () => {
  if (typeof contentIdeasAPI.overview !== 'function') return;
  isLoading.value = true;
  try {
    const { data } = await contentIdeasAPI.overview();
    items.value = Array.isArray(data?.calendar) ? data.calendar : [];
  } catch {
    useAlert(t('KALO_MARKETING.CALENDAR.LOAD_ERROR'));
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  form.value = {
    title: '',
    channel: 'tiktok',
    status: 'scheduled',
    scheduled_for: todayIso(),
    campaign_tag: '',
    hook: '',
    body: '',
    cta: '',
  };
};

const addItem = async () => {
  if (!form.value.title.trim() || !form.value.scheduled_for) return;
  isSaving.value = true;
  try {
    const { data } = await contentIdeasAPI.saveCalendarItem({
      ...form.value,
      title: form.value.title.trim(),
    });
    if (data?.item) {
      items.value = [data.item, ...items.value];
    }
    useAlert(t('KALO_MARKETING.CALENDAR.SAVED'));
    resetForm();
    showAddForm.value = false;
  } catch {
    useAlert(t('KALO_MARKETING.CALENDAR.SAVE_ERROR'));
  } finally {
    isSaving.value = false;
  }
};

const changeStatus = async (item, nextStatus) => {
  try {
    const { data } = await contentIdeasAPI.saveCalendarItem({
      id: item.id,
      title: item.title,
      channel: item.channel,
      scheduled_for: item.scheduled_for,
      status: nextStatus,
    });
    if (data?.item) {
      items.value = items.value.map(entry =>
        entry.id === item.id ? data.item : entry
      );
    }
    useAlert(t('KALO_MARKETING.CALENDAR.SAVED'));
  } catch {
    useAlert(t('KALO_MARKETING.CALENDAR.SAVE_ERROR'));
  }
};

const removeItem = async id => {
  try {
    await contentIdeasAPI.deleteCalendarItem(id);
    items.value = items.value.filter(item => item.id !== id);
    useAlert(t('KALO_MARKETING.CALENDAR.DELETED'));
  } catch {
    useAlert(t('KALO_MARKETING.CALENDAR.SAVE_ERROR'));
  }
};

const copyItem = async item => {
  const script = [item.hook, item.body, item.cta].filter(Boolean).join('\n\n');
  try {
    await navigator.clipboard?.writeText(script);
    copiedId.value = item.id;
    setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = '';
    }, 2000);
  } catch {
    // Ignore clipboard blocks in non-HTTPS contexts.
  }
};

onMounted(loadCalendar);
</script>

<template>
  <div class="flex flex-col max-w-4xl gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_MARKETING.CALENDAR.TITLE') }}
        </h2>
        <p class="mt-0.5 text-sm text-n-slate-11">
          {{ t('KALO_MARKETING.CALENDAR.DESC') }}
        </p>
      </div>
      <Button
        data-test="calendar-add-toggle"
        :variant="showAddForm ? 'faded' : 'solid'"
        :color="showAddForm ? 'slate' : 'blue'"
        size="sm"
        :label="
          showAddForm
            ? t('KALO_MARKETING.CALENDAR.CANCEL')
            : t('KALO_MARKETING.CALENDAR.ADD')
        "
        @click="showAddForm = !showAddForm"
      />
    </div>

    <form
      v-if="showAddForm"
      data-test="calendar-add-form"
      class="flex flex-col gap-3 p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
      @submit.prevent="addItem"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.CALENDAR.TITLE_FIELD') }}
          <input
            v-model="form.title"
            data-test="calendar-title"
            type="text"
            :placeholder="t('KALO_MARKETING.CALENDAR.TITLE_PLACEHOLDER')"
            :class="INPUT_CLASS"
          />
        </label>
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.CALENDAR.DATE') }}
          <input
            v-model="form.scheduled_for"
            data-test="calendar-date"
            type="date"
            :class="INPUT_CLASS"
          />
        </label>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.CALENDAR.CHANNEL') }}
          <select
            v-model="form.channel"
            data-test="calendar-channel"
            :class="SELECT_CLASS"
          >
            <option v-for="ch in CHANNELS" :key="ch" :value="ch">
              {{ t(`KALO_MARKETING.CALENDAR.CHANNELS.${ch}`) }}
            </option>
          </select>
        </label>
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.CALENDAR.STATUS.scheduled') }}
          <select v-model="form.status" :class="SELECT_CLASS">
            <option v-for="st in STATUSES" :key="st" :value="st">
              {{ t(`KALO_MARKETING.CALENDAR.STATUS.${st}`) }}
            </option>
          </select>
        </label>
        <label
          class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.CALENDAR.CAMPAIGN_TAG') }}
          <input
            v-model="form.campaign_tag"
            type="text"
            :placeholder="t('KALO_MARKETING.CALENDAR.CAMPAIGN_TAG_PLACEHOLDER')"
            :class="INPUT_CLASS"
          />
        </label>
      </div>
      <label class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.CALENDAR.HOOK') }}
        <input v-model="form.hook" type="text" :class="INPUT_CLASS" />
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.CALENDAR.BODY') }}
        <textarea v-model="form.body" rows="2" :class="INPUT_CLASS" />
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.CALENDAR.CTA') }}
        <input v-model="form.cta" type="text" :class="INPUT_CLASS" />
      </label>
      <div class="flex justify-end">
        <Button
          type="submit"
          data-test="calendar-save"
          :disabled="isSaving"
          :is-loading="isSaving"
          :label="t('KALO_MARKETING.CALENDAR.SAVE')"
        />
      </div>
    </form>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="st in ['all', ...STATUSES]"
          :key="st"
          type="button"
          class="px-3 py-1.5 text-xs font-semibold border rounded-lg"
          :class="
            statusFilter === st
              ? 'bg-n-solid-1 border-n-brand text-n-slate-12'
              : 'bg-n-alpha-1 border-n-weak text-n-slate-11'
          "
          @click="statusFilter = st"
        >
          {{
            st === 'all'
              ? t('KALO_MARKETING.CALENDAR.ALL')
              : t(`KALO_MARKETING.CALENDAR.STATUS.${st}`)
          }}
        </button>
      </div>
      <select v-model="channelFilter" :class="SELECT_CLASS">
        <option value="all">{{ t('KALO_MARKETING.CALENDAR.ALL') }}</option>
        <option v-for="ch in CHANNELS" :key="ch" :value="ch">
          {{ t(`KALO_MARKETING.CALENDAR.CHANNELS.${ch}`) }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="text-sm text-n-slate-11">
      {{ t('KALO_REPORTS.LOADING') }}
    </p>

    <div v-else-if="visibleItems.length" class="flex flex-col gap-3">
      <article
        v-for="item in visibleItems"
        :key="item.id"
        data-test="calendar-item"
        class="p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-n-alpha-2 text-n-slate-12"
            >
              {{ item.scheduled_for }}
            </span>
            <span
              class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-slate-11"
            >
              {{ t(`KALO_MARKETING.CALENDAR.CHANNELS.${item.channel}`) }}
            </span>
            <span
              v-if="item.campaign_tag"
              class="px-2 py-0.5 text-xs rounded-full bg-n-alpha-1 text-n-slate-11"
            >
              #{{ item.campaign_tag }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              :value="item.status"
              data-test="calendar-status-select"
              :class="SELECT_CLASS"
              @change="changeStatus(item, $event.target.value)"
            >
              <option v-for="st in STATUSES" :key="st" :value="st">
                {{ t(`KALO_MARKETING.CALENDAR.STATUS.${st}`) }}
              </option>
            </select>
            <Button
              v-if="item.hook || item.body || item.cta"
              variant="faded"
              color="slate"
              size="xs"
              :label="
                copiedId === item.id
                  ? t('KALO_MARKETING.CALENDAR.COPIED')
                  : t('KALO_MARKETING.CALENDAR.COPY')
              "
              @click="copyItem(item)"
            />
            <Button
              data-test="calendar-delete"
              variant="ghost"
              color="ruby"
              size="xs"
              :label="t('KALO_MARKETING.CALENDAR.DELETE')"
              @click="removeItem(item.id)"
            />
          </div>
        </div>
        <h3 class="mt-2 text-sm font-bold text-n-slate-12">
          {{ item.title }}
        </h3>
        <p v-if="item.hook" class="mt-1 text-sm font-medium text-n-slate-12">
          {{ item.hook }}
        </p>
        <p v-if="item.body" class="mt-1 text-sm text-n-slate-11">
          {{ item.body }}
        </p>
        <p v-if="item.cta" class="mt-1 text-sm font-semibold text-n-brand">
          {{ item.cta }}
        </p>
      </article>
    </div>

    <p v-else data-test="calendar-empty" class="text-sm text-n-slate-11">
      {{ t('KALO_MARKETING.CALENDAR.EMPTY') }}
    </p>
  </div>
</template>
