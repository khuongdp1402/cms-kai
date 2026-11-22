<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import postsAPI from 'dashboard/api/kchat/posts';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import {
  EDITABLE_STATUSES,
  POST_FORMATS,
  STATUS_TONES,
  VIDEO_TYPES,
  acceptFor,
  allowsMultipleMedia,
  apiError,
  buildPostFormData,
  statusKey,
  toLocalInput,
} from './postHelpers';

const props = defineProps({
  // null = new post
  post: { type: Object, default: null },
  // Facebook Page inboxes ({ id, name })
  pages: { type: Array, default: () => [] },
  // datetime-local value preset for a new post (calendar day click)
  defaultSchedule: { type: String, default: '' },
});

const emit = defineEmits(['close', 'saved', 'removed']);

const { t } = useI18n();
const { isAdmin } = useAdmin();

const current = ref(props.post);
const form = reactive({
  inbox_id: props.post?.inbox_id ?? props.pages[0]?.id ?? '',
  post_format: props.post?.post_format || 'photo',
  caption: props.post?.caption || '',
  link_url: props.post?.link_url || '',
  pillar: props.post?.pillar || '',
  media_brief: props.post?.media_brief || '',
  scheduled_local:
    toLocalInput(props.post?.scheduled_at) || props.defaultSchedule,
});
const newFiles = ref([]);
const removeMediaIds = ref([]);
const rejectNote = ref('');
const showReject = ref(false);
const busy = ref('');
const error = ref(null);

const status = computed(() => current.value?.status || 'draft');
const isNew = computed(() => !current.value);
const isEditable = computed(
  () => isNew.value || EDITABLE_STATUSES.includes(status.value)
);
const isLocked = computed(() => !isEditable.value);
const dirty = ref(isNew.value);
const markDirty = () => {
  dirty.value = true;
};

// Media studio link (ADR-032): only one open request per post.
const canRequestMedia = computed(
  () =>
    !!form.media_brief.trim() &&
    !['requested', 'in_production'].includes(
      current.value?.media_request_status
    )
);

const keptMedia = computed(() =>
  (current.value?.media || []).filter(
    file => !removeMediaIds.value.includes(file.id)
  )
);

const previews = ref([]);
const revokePreviews = () =>
  previews.value.forEach(p => URL.revokeObjectURL(p.url));
onBeforeUnmount(revokePreviews);

const mediaItems = computed(() => [
  ...keptMedia.value.map(file => ({
    key: `saved-${file.id}`,
    id: file.id,
    url: file.url,
    isVideo: VIDEO_TYPES.includes(file.content_type),
    name: file.filename,
  })),
  ...previews.value,
]);

const onFiles = event => {
  const files = [...(event.target.files || [])];
  event.target.value = '';
  if (!files.length) return;
  if (!allowsMultipleMedia(form.post_format)) {
    // One file formats: the new file replaces everything.
    removeMediaIds.value = (current.value?.media || []).map(file => file.id);
    revokePreviews();
    previews.value = [];
    newFiles.value = [];
  }
  const accepted = allowsMultipleMedia(form.post_format) ? files : [files[0]];
  newFiles.value = [...newFiles.value, ...accepted];
  previews.value = [
    ...previews.value,
    ...accepted.map((file, index) => ({
      key: `new-${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      isVideo: VIDEO_TYPES.includes(file.type),
      name: file.name,
    })),
  ];
  markDirty();
};

const removeMedia = item => {
  if (item.id) {
    removeMediaIds.value = [...removeMediaIds.value, item.id];
  } else {
    URL.revokeObjectURL(item.url);
    previews.value = previews.value.filter(p => p.key !== item.key);
    newFiles.value = newFiles.value.filter(file => file !== item.file);
  }
  markDirty();
};

const pageName = computed(
  () =>
    props.pages.find(page => String(page.id) === String(form.inbox_id))
      ?.name || t('KALO_PUBLISHING.EDITOR.PAGE_PLACEHOLDER')
);

const errorText = computed(() => {
  if (!error.value) return '';
  const key = `KALO_PUBLISHING.ERRORS.${error.value.code.toUpperCase()}`;
  const translated = t(key);
  return translated === key ? t('KALO_PUBLISHING.ERRORS.UNKNOWN') : translated;
});

const blockerLabels = computed(() =>
  (error.value?.blockers?.length
    ? error.value.blockers
    : current.value?.blockers || []
  ).map(code => t(`KALO_PUBLISHING.BLOCKERS.${code.toUpperCase()}`))
);

const publishError = computed(() => {
  const code = current.value?.error_code;
  if (!code) return '';
  const key = `KALO_PUBLISHING.PUBLISH_ERRORS.${code.toUpperCase()}`;
  const translated = t(key);
  return translated === key ? current.value.error_message || code : translated;
});

const run = async (name, request, successKey) => {
  if (busy.value) return null;
  busy.value = name;
  error.value = null;
  try {
    const { data } = await request();
    if (data) {
      current.value = data;
      emit('saved', data);
    }
    if (successKey) useAlert(t(successKey));
    return data;
  } catch (e) {
    error.value = apiError(e);
    return null;
  } finally {
    busy.value = '';
  }
};

const persist = async () => {
  const body = buildPostFormData(form, {
    files: newFiles.value,
    removeMediaIds: removeMediaIds.value,
  });
  const saved = await run(
    'save',
    () =>
      isNew.value
        ? postsAPI.create(body)
        : postsAPI.update(current.value.id, body),
    null
  );
  if (saved) {
    revokePreviews();
    previews.value = [];
    newFiles.value = [];
    removeMediaIds.value = [];
    dirty.value = false;
  }
  return saved;
};

const save = async () => {
  if (await persist()) useAlert(t('KALO_PUBLISHING.TOASTS.SAVED'));
};

const submit = async () => {
  if (dirty.value && !(await persist())) return;
  await run(
    'submit',
    () => postsAPI.submit(current.value.id),
    'KALO_PUBLISHING.TOASTS.SUBMITTED'
  );
};

const requestMedia = async () => {
  if (dirty.value && !(await persist())) return;
  await run(
    'request',
    () => postsAPI.requestMedia(current.value.id),
    'KALO_PUBLISHING.TOASTS.MEDIA_REQUESTED'
  );
};

const approve = () =>
  run(
    'approve',
    () => postsAPI.approve(current.value.id),
    'KALO_PUBLISHING.TOASTS.APPROVED'
  );

const reject = async () => {
  const done = await run(
    'reject',
    () => postsAPI.reject(current.value.id, rejectNote.value),
    'KALO_PUBLISHING.TOASTS.REJECTED'
  );
  if (done) showReject.value = false;
};

const unapprove = () =>
  run('unapprove', () => postsAPI.unapprove(current.value.id), null);

const retry = () => {
  if (
    current.value.error_code === 'publish_unknown' &&
    // eslint-disable-next-line no-alert
    !window.confirm(t('KALO_PUBLISHING.ACTIONS.RETRY_UNKNOWN_CONFIRM'))
  )
    return null;
  return run(
    'retry',
    () => postsAPI.retryPublish(current.value.id),
    'KALO_PUBLISHING.TOASTS.RETRIED'
  );
};

const remove = async () => {
  // eslint-disable-next-line no-alert
  if (!window.confirm(t('KALO_PUBLISHING.ACTIONS.DELETE_CONFIRM'))) return;
  busy.value = 'delete';
  try {
    await postsAPI.destroy(current.value.id);
    emit('removed', current.value.id);
    emit('close');
  } catch (e) {
    error.value = apiError(e);
  } finally {
    busy.value = '';
  }
};

const fieldClass =
  'w-full px-3 py-2 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-n-brand disabled:opacity-60';
const labelClass = 'flex flex-col gap-1 text-sm font-semibold text-n-slate-12';
</script>

<template>
  <KaloDrawer
    data-test="post-editor"
    width-class="sm:max-w-[640px]"
    :title="
      isNew
        ? t('KALO_PUBLISHING.EDITOR.TITLE_NEW')
        : t('KALO_PUBLISHING.EDITOR.TITLE_EDIT')
    "
    @close="emit('close')"
  >
    <template #headerExtra>
      <span
        data-test="post-status"
        class="px-2 py-0.5 text-xs font-semibold rounded-full"
        :class="STATUS_TONES[status]"
      >
        {{ t(`KALO_PUBLISHING.STATUS.${statusKey(status)}`) }}
      </span>
      <span
        v-if="current?.media_request_status"
        data-test="post-media-request"
        class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-slate-11"
      >
        {{
          t(
            `KALO_PUBLISHING.MEDIA_REQUEST.${statusKey(current.media_request_status)}`
          )
        }}
      </span>
    </template>

    <p
      v-if="errorText"
      role="alert"
      data-test="post-error"
      class="mb-0 text-sm font-medium text-n-ruby-11"
    >
      {{ errorText }}
    </p>
    <div
      v-if="blockerLabels.length"
      data-test="post-blockers"
      class="p-3 text-sm border rounded-xl border-n-amber-6 bg-n-amber-2 text-n-amber-12"
    >
      <p class="mb-1 font-semibold">
        {{ t('KALO_PUBLISHING.BLOCKERS.TITLE') }}
      </p>
      <ul class="mb-0 list-disc ltr:pl-5 rtl:pr-5">
        <li v-for="label in blockerLabels" :key="label">{{ label }}</li>
      </ul>
    </div>
    <p
      v-if="current?.review_note && status === 'draft'"
      data-test="post-review-note"
      class="p-3 mb-0 text-sm rounded-xl bg-n-alpha-2 text-n-slate-12"
    >
      {{ t('KALO_PUBLISHING.EDITOR.REVIEW_NOTE') }}: {{ current.review_note }}
    </p>
    <p
      v-if="publishError && status === 'failed'"
      data-test="post-publish-error"
      class="p-3 mb-0 text-sm rounded-xl bg-n-ruby-2 text-n-ruby-11"
    >
      {{ publishError }}
    </p>
    <p v-if="isLocked" class="mb-0 text-sm text-n-slate-11">
      {{ t('KALO_PUBLISHING.EDITOR.READONLY') }}
    </p>
    <p
      v-else-if="['pending_approval', 'approved'].includes(status)"
      class="mb-0 text-xs text-n-slate-11"
    >
      {{ t('KALO_PUBLISHING.EDITOR.EDIT_RESETS') }}
    </p>
    <a
      v-if="current?.permalink"
      :href="current.permalink"
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm font-semibold text-n-brand"
    >
      {{ t('KALO_PUBLISHING.EDITOR.PERMALINK') }}
    </a>

    <fieldset :disabled="isLocked" class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <label :class="labelClass">
          {{ t('KALO_PUBLISHING.EDITOR.PAGE') }}
          <select
            v-model="form.inbox_id"
            data-test="post-page"
            :class="fieldClass"
            @change="markDirty"
          >
            <option value="">
              {{ t('KALO_PUBLISHING.EDITOR.PAGE_PLACEHOLDER') }}
            </option>
            <option v-for="page in pages" :key="page.id" :value="page.id">
              {{ page.name }}
            </option>
          </select>
          <span
            v-if="!pages.length"
            class="text-xs font-normal text-n-slate-11"
          >
            {{ t('KALO_PUBLISHING.EDITOR.NO_PAGE') }}
          </span>
        </label>
        <label :class="labelClass">
          {{ t('KALO_PUBLISHING.EDITOR.SCHEDULE') }}
          <input
            v-model="form.scheduled_local"
            data-test="post-schedule"
            type="datetime-local"
            :class="fieldClass"
            @change="markDirty"
          />
          <span class="text-xs font-normal text-n-slate-11">
            {{ t('KALO_PUBLISHING.EDITOR.TIMEZONE_NOTE') }}
          </span>
        </label>
      </div>

      <div
        class="flex flex-col gap-1"
        role="radiogroup"
        :aria-label="t('KALO_PUBLISHING.EDITOR.FORMAT')"
      >
        <span class="text-sm font-semibold text-n-slate-12">
          {{ t('KALO_PUBLISHING.EDITOR.FORMAT') }}
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="format in POST_FORMATS"
            :key="format"
            type="button"
            role="radio"
            :data-test="`post-format-${format}`"
            :aria-checked="form.post_format === format"
            class="px-3 py-1.5 text-xs font-semibold border rounded-lg"
            :class="
              form.post_format === format
                ? 'border-n-brand bg-n-brand/10 text-n-slate-12'
                : 'border-n-weak text-n-slate-11 hover:text-n-slate-12'
            "
            @click="
              form.post_format = format;
              markDirty();
            "
          >
            {{ t(`KALO_PUBLISHING.FORMAT.${statusKey(format)}`) }}
          </button>
        </div>
      </div>

      <label :class="labelClass">
        {{ t('KALO_PUBLISHING.EDITOR.CAPTION') }}
        <textarea
          v-model="form.caption"
          data-test="post-caption"
          rows="6"
          :placeholder="t('KALO_PUBLISHING.EDITOR.CAPTION_PLACEHOLDER')"
          :class="fieldClass"
          @input="markDirty"
        />
        <span class="text-xs font-normal text-n-slate-11">
          {{
            t('KALO_PUBLISHING.EDITOR.CAPTION_COUNT', {
              count: form.caption.length,
            })
          }}
        </span>
      </label>

      <label v-if="form.post_format === 'text'" :class="labelClass">
        {{ t('KALO_PUBLISHING.EDITOR.LINK') }}
        <input
          v-model="form.link_url"
          data-test="post-link"
          type="url"
          placeholder="https://"
          :class="fieldClass"
          @input="markDirty"
        />
      </label>

      <div
        v-if="form.post_format !== 'text'"
        data-test="post-media"
        class="flex flex-col gap-2"
      >
        <span class="text-sm font-semibold text-n-slate-12">
          {{ t('KALO_PUBLISHING.EDITOR.MEDIA') }}
        </span>
        <span class="text-xs text-n-slate-11">
          {{
            t(
              `KALO_PUBLISHING.EDITOR.MEDIA_HINT.${statusKey(form.post_format)}`
            )
          }}
        </span>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="item in mediaItems"
            :key="item.key"
            class="relative overflow-hidden border rounded-lg size-24 border-n-weak bg-n-alpha-2"
          >
            <video
              v-if="item.isVideo"
              :src="item.url"
              muted
              class="object-cover size-full"
            />
            <img
              v-else
              :src="item.url"
              :alt="item.name"
              class="object-cover size-full"
            />
            <button
              v-if="!isLocked"
              type="button"
              :aria-label="t('KALO_PUBLISHING.EDITOR.MEDIA_REMOVE')"
              class="absolute grid text-xs rounded-full top-1 ltr:right-1 rtl:left-1 size-6 place-content-center bg-n-solid-1 text-n-slate-12"
              @click="removeMedia(item)"
            >
              ×
            </button>
          </div>
          <label
            v-if="!isLocked"
            class="grid text-xs font-semibold text-center border border-dashed rounded-lg cursor-pointer size-24 place-content-center border-n-strong text-n-slate-11 hover:text-n-slate-12"
          >
            {{ t('KALO_PUBLISHING.EDITOR.MEDIA_ADD') }}
            <input
              data-test="post-media-input"
              type="file"
              class="sr-only"
              :accept="acceptFor(form.post_format)"
              :multiple="allowsMultipleMedia(form.post_format)"
              @change="onFiles"
            />
          </label>
        </div>
      </div>

      <label :class="labelClass">
        {{ t('KALO_PUBLISHING.EDITOR.MEDIA_BRIEF') }}
        <textarea
          v-model="form.media_brief"
          data-test="post-media-brief"
          rows="3"
          :placeholder="t('KALO_PUBLISHING.EDITOR.MEDIA_BRIEF_PLACEHOLDER')"
          :class="fieldClass"
          @input="markDirty"
        />
        <span class="text-xs font-normal text-n-slate-11">
          {{ t('KALO_PUBLISHING.EDITOR.MEDIA_BRIEF_HINT') }}
        </span>
      </label>

      <label :class="labelClass">
        {{ t('KALO_PUBLISHING.EDITOR.PILLAR') }}
        <input
          v-model="form.pillar"
          type="text"
          :placeholder="t('KALO_PUBLISHING.EDITOR.PILLAR_PLACEHOLDER')"
          :class="fieldClass"
          @input="markDirty"
        />
      </label>
    </fieldset>

    <section
      data-test="post-preview"
      class="flex flex-col gap-2 p-4 border rounded-2xl border-n-weak bg-n-solid-2"
    >
      <span class="text-xs font-semibold uppercase text-n-slate-10">
        {{ t('KALO_PUBLISHING.EDITOR.PREVIEW') }}
      </span>
      <div class="flex flex-col gap-2 p-3 rounded-xl bg-n-solid-1">
        <span class="text-sm font-bold text-n-slate-12">{{ pageName }}</span>
        <p
          class="mb-0 text-sm whitespace-pre-line text-n-slate-12 line-clamp-6"
        >
          {{ form.caption || t('KALO_PUBLISHING.EDITOR.PREVIEW_EMPTY') }}
        </p>
        <div
          v-if="mediaItems.length && form.post_format !== 'text'"
          class="grid gap-1"
          :class="mediaItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
        >
          <template v-for="item in mediaItems.slice(0, 4)" :key="item.key">
            <video
              v-if="item.isVideo"
              :src="item.url"
              controls
              class="object-cover w-full rounded-lg max-h-80"
            />
            <img
              v-else
              :src="item.url"
              :alt="item.name"
              class="object-cover w-full rounded-lg max-h-80"
            />
          </template>
        </div>
        <span
          v-if="current?.ai_generated"
          class="text-xs font-semibold text-n-slate-11"
        >
          {{ t('KALO_PUBLISHING.EDITOR.AI_LABEL') }}
        </span>
      </div>
    </section>

    <div
      v-if="showReject"
      data-test="post-reject-form"
      class="flex flex-col gap-2"
    >
      <label :class="labelClass">
        {{ t('KALO_PUBLISHING.EDITOR.REJECT_NOTE') }}
        <textarea v-model="rejectNote" rows="2" :class="fieldClass" />
      </label>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button
          v-if="!isNew && EDITABLE_STATUSES.includes(status)"
          data-test="post-delete"
          variant="ghost"
          color="ruby"
          size="sm"
          class="ltr:mr-auto rtl:ml-auto"
          :label="t('KALO_PUBLISHING.ACTIONS.DELETE')"
          :is-loading="busy === 'delete'"
          @click="remove"
        />
        <template v-if="isEditable">
          <Button
            v-if="canRequestMedia"
            data-test="post-request-media"
            variant="outline"
            color="slate"
            size="sm"
            :label="t('KALO_PUBLISHING.ACTIONS.REQUEST_MEDIA')"
            :is-loading="busy === 'request'"
            @click="requestMedia"
          />
          <Button
            data-test="post-save"
            variant="outline"
            color="slate"
            size="sm"
            :label="t('KALO_PUBLISHING.ACTIONS.SAVE')"
            :is-loading="busy === 'save'"
            :disabled="!dirty"
            @click="save"
          />
        </template>
        <Button
          v-if="isNew || status === 'draft'"
          data-test="post-submit"
          size="sm"
          :label="t('KALO_PUBLISHING.ACTIONS.SUBMIT')"
          :is-loading="busy === 'submit'"
          @click="submit"
        />
        <template v-if="isAdmin && status === 'pending_approval' && !dirty">
          <Button
            v-if="!showReject"
            data-test="post-reject"
            variant="outline"
            color="ruby"
            size="sm"
            :label="t('KALO_PUBLISHING.ACTIONS.REJECT')"
            @click="showReject = true"
          />
          <Button
            v-else
            data-test="post-reject-confirm"
            variant="outline"
            color="ruby"
            size="sm"
            :label="t('KALO_PUBLISHING.ACTIONS.REJECT_CONFIRM')"
            :is-loading="busy === 'reject'"
            @click="reject"
          />
          <Button
            data-test="post-approve"
            size="sm"
            :label="t('KALO_PUBLISHING.ACTIONS.APPROVE')"
            :is-loading="busy === 'approve'"
            @click="approve"
          />
        </template>
        <Button
          v-if="isAdmin && status === 'approved' && !dirty"
          data-test="post-unapprove"
          variant="outline"
          color="slate"
          size="sm"
          :label="t('KALO_PUBLISHING.ACTIONS.UNAPPROVE')"
          :is-loading="busy === 'unapprove'"
          @click="unapprove"
        />
        <Button
          v-if="isAdmin && status === 'failed' && !dirty"
          data-test="post-retry"
          size="sm"
          :label="t('KALO_PUBLISHING.ACTIONS.RETRY')"
          :is-loading="busy === 'retry'"
          @click="retry"
        />
      </div>
    </template>
  </KaloDrawer>
</template>
