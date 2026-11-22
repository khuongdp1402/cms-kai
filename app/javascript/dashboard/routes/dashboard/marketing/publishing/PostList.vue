<script setup>
import { useI18n } from 'vue-i18n';
import Button from 'dashboard/components-next/button/Button.vue';
import { STATUS_TONES, statusKey } from './postHelpers';

defineProps({
  posts: { type: Array, default: () => [] },
  emptyText: { type: String, default: '' },
  // Shows the quick approve button (review queue, administrators only).
  canApprove: { type: Boolean, default: false },
  busyId: { type: [Number, null], default: null },
});

const emit = defineEmits(['open', 'approve']);

const { t, locale } = useI18n();

const when = iso =>
  iso
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    : t('KALO_PUBLISHING.LIST.NO_SCHEDULE');

const errorText = post => {
  const code = (post.error_code || '').toUpperCase();
  const key = `KALO_PUBLISHING.PUBLISH_ERRORS.${code}`;
  const translated = t(key);
  return translated === key ? post.error_message || post.error_code : translated;
};

const thumbOf = post =>
  (post.media || []).find(file => file.content_type.startsWith('image/'));
</script>

<template>
  <p
    v-if="!posts.length"
    data-test="post-list-empty"
    class="p-6 mb-0 text-sm text-center border border-dashed rounded-2xl border-n-weak text-n-slate-11"
  >
    {{ emptyText }}
  </p>
  <ul v-else data-test="post-list" class="flex flex-col gap-2 mb-0">
    <li
      v-for="post in posts"
      :key="post.id"
      :data-test="`post-row-${post.id}`"
      class="flex flex-wrap items-start gap-3 p-3 border rounded-xl border-n-weak bg-n-solid-1"
    >
      <img
        v-if="thumbOf(post)"
        :src="thumbOf(post).url"
        :alt="thumbOf(post).filename"
        class="object-cover rounded-lg size-14 shrink-0"
      />
      <button
        type="button"
        class="flex flex-col flex-1 min-w-0 gap-1 text-start"
        @click="emit('open', post)"
      >
        <span class="flex flex-wrap items-center gap-2">
          <span
            class="px-2 py-0.5 text-xs font-semibold rounded-full"
            :class="STATUS_TONES[post.status]"
          >
            {{ t(`KALO_PUBLISHING.STATUS.${statusKey(post.status)}`) }}
          </span>
          <span class="text-xs text-n-slate-11">
            {{ post.inbox_name || t('KALO_PUBLISHING.EDITOR.PAGE_PLACEHOLDER') }}
            · {{ t(`KALO_PUBLISHING.FORMAT.${statusKey(post.post_format)}`) }}
            · {{ when(post.published_at || post.scheduled_at) }}
          </span>
        </span>
        <span class="text-sm text-n-slate-12 line-clamp-2">
          {{
            post.caption ||
            post.media_brief ||
            t('KALO_PUBLISHING.EDITOR.PREVIEW_EMPTY')
          }}
        </span>
        <span
          v-if="post.status === 'failed'"
          class="text-xs font-medium text-n-ruby-11"
        >
          {{ errorText(post) }}
        </span>
      </button>
      <div class="flex items-center gap-2 shrink-0">
        <a
          v-if="post.permalink"
          :href="post.permalink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs font-semibold text-n-brand"
        >
          {{ t('KALO_PUBLISHING.EDITOR.PERMALINK') }}
        </a>
        <Button
          v-if="canApprove && post.status === 'pending_approval'"
          :data-test="`post-quick-approve-${post.id}`"
          size="sm"
          :label="t('KALO_PUBLISHING.ACTIONS.APPROVE')"
          :is-loading="busyId === post.id"
          :disabled="post.blockers?.length > 0"
          @click="emit('approve', post)"
        />
      </div>
    </li>
  </ul>
</template>
