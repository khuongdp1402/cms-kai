<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import { REPLY_EDITOR_MODES } from './constants';

const props = defineProps({
  mode: {
    type: String,
    default: REPLY_EDITOR_MODES.REPLY,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  isReplyRestricted: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggleMode']);

const { t } = useI18n();

// When replies are restricted (24h window, API inbox) only private notes are possible.
const isPrivate = computed(
  () => props.isReplyRestricted || props.mode === REPLY_EDITOR_MODES.NOTE
);

// Two explicit tabs; the parent contract stays a single `toggleMode` emit,
// fired only when the tab that is not active is chosen.
const choose = wantsPrivate => {
  if (props.disabled || wantsPrivate === isPrivate.value) return;
  if (!wantsPrivate && props.isReplyRestricted) return;
  emit('toggleMode');
};

const tabClass = active => [
  'inline-flex items-center gap-1.5 h-8 px-3 text-sm font-semibold rounded-full transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed',
  active
    ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
    : 'text-n-slate-11 enabled:hover:text-n-slate-12',
];
</script>

<template>
  <div
    role="tablist"
    class="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-n-alpha-2"
  >
    <button
      type="button"
      role="tab"
      data-test="mode-reply"
      :aria-selected="!isPrivate"
      :disabled="disabled || isReplyRestricted"
      :class="tabClass(!isPrivate)"
      @click="choose(false)"
    >
      {{ t('KALO_CHAT_THREAD.COMPOSER.REPLY') }}
    </button>
    <button
      type="button"
      role="tab"
      data-test="mode-note"
      :aria-selected="isPrivate"
      :disabled="disabled"
      :class="[tabClass(isPrivate), { '!text-n-amber-11': isPrivate }]"
      @click="choose(true)"
    >
      <KaloIcon name="lock" class="size-3.5" />
      {{ t('KALO_CHAT_THREAD.COMPOSER.NOTE') }}
    </button>
  </div>
</template>
