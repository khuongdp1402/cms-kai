<script setup>
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import { MODES, useKaloAssistant } from './useKaloAssistant';

const emit = defineEmits(['close']);

const STARTERS = ['ONE', 'TWO', 'THREE'];
const DOT_DELAYS = [
  '[animation-delay:0ms]',
  '[animation-delay:150ms]',
  '[animation-delay:300ms]',
];

const { t } = useI18n();
const { messages, mode, isLoading, error, setMode, send } = useKaloAssistant();

const draft = ref('');
const copiedIndex = ref(-1);
const listRef = ref(null);
let copiedTimer = null;

const scrollToEnd = async () => {
  await nextTick();
  const el = listRef.value;
  if (el?.parentElement)
    el.parentElement.scrollTop = el.parentElement.scrollHeight;
};

watch(() => messages.value.length, scrollToEnd);
watch(isLoading, scrollToEnd);

const submit = async text => {
  const value = (text ?? draft.value).trim();
  if (!value || isLoading.value) return;
  draft.value = '';
  const ok = await send(value);
  // Failed: give the text back so the user can retry.
  if (!ok && !draft.value) draft.value = value;
};

const onEnter = event => {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  submit();
};

const copy = async (content, index) => {
  try {
    await navigator.clipboard.writeText(content);
    copiedIndex.value = index;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedIndex.value = -1;
    }, 2000);
  } catch {
    copiedIndex.value = -1;
  }
};
</script>

<template>
  <KaloDrawer
    data-test-id="kalo-assistant-drawer"
    :title="t('KALO_ASSISTANT.TITLE')"
    :description="t('KALO_ASSISTANT.DESCRIPTION')"
    @close="emit('close')"
  >
    <div
      role="group"
      :aria-label="t('KALO_ASSISTANT.MODES_LABEL')"
      class="flex flex-wrap gap-2"
    >
      <button
        v-for="item in MODES"
        :key="item"
        type="button"
        :data-test-id="`kalo-assistant-mode-${item}`"
        :aria-pressed="mode === item"
        class="px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
        :class="
          mode === item
            ? 'bg-n-blue-3 border-n-blue-9 text-n-blue-11'
            : 'border-transparent bg-n-alpha-1 text-n-slate-12 hover:bg-n-alpha-2'
        "
        @click="setMode(item)"
      >
        {{ t(`KALO_ASSISTANT.MODE.${item.toUpperCase()}`) }}
      </button>
    </div>

    <div
      v-if="!messages.length"
      data-test-id="kalo-assistant-starters"
      class="flex flex-col gap-2"
    >
      <p class="text-sm text-n-slate-11">
        {{ t(`KALO_ASSISTANT.HINT.${mode.toUpperCase()}`) }}
      </p>
      <button
        v-for="key in STARTERS"
        :key="key"
        type="button"
        data-test-id="kalo-assistant-starter"
        class="px-3 py-2.5 text-sm text-start rounded-xl bg-n-alpha-1 text-n-slate-12 hover:bg-n-alpha-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
        @click="
          submit(t(`KALO_ASSISTANT.STARTERS.${mode.toUpperCase()}.${key}`))
        "
      >
        {{ t(`KALO_ASSISTANT.STARTERS.${mode.toUpperCase()}.${key}`) }}
      </button>
    </div>

    <ul
      ref="listRef"
      role="log"
      aria-live="polite"
      class="flex flex-col gap-3 m-0 list-none"
    >
      <li
        v-for="(message, index) in messages"
        :key="index"
        :data-test-id="`kalo-assistant-${message.role}`"
        class="flex flex-col gap-1"
        :class="message.role === 'user' ? 'items-end' : 'items-start'"
      >
        <!-- AI output is untrusted: rendered as text only, never as HTML. -->
        <div
          class="max-w-[92%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl text-n-slate-12"
          :class="
            message.role === 'user'
              ? 'bg-n-blue-3 rounded-ee-md'
              : 'bg-n-alpha-1 rounded-es-md'
          "
        >
          {{ message.content }}
        </div>
        <button
          v-if="message.role === 'assistant'"
          type="button"
          data-test-id="kalo-assistant-copy"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-n-slate-11 hover:bg-n-alpha-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
          @click="copy(message.content, index)"
        >
          <KaloIcon
            :name="copiedIndex === index ? 'check' : 'clip'"
            class="size-4"
          />
          {{
            copiedIndex === index
              ? t('KALO_ASSISTANT.COPIED')
              : t('KALO_ASSISTANT.COPY')
          }}
        </button>
      </li>
      <li
        v-if="isLoading"
        data-test-id="kalo-assistant-loading"
        role="status"
        :aria-label="t('KALO_ASSISTANT.THINKING')"
        class="flex items-center gap-1 px-3.5 py-3 rounded-2xl rounded-es-md w-fit bg-n-alpha-1"
      >
        <span
          v-for="delay in DOT_DELAYS"
          :key="delay"
          class="rounded-full size-1.5 bg-n-slate-10 animate-pulse"
          :class="delay"
        />
      </li>
    </ul>

    <div
      v-if="error"
      role="alert"
      data-test-id="kalo-assistant-error"
      class="px-3.5 py-3 text-sm rounded-xl bg-n-ruby-3 text-n-ruby-11"
    >
      {{ t(`KALO_ASSISTANT.ERRORS.${error}`) }}
      <router-link
        v-if="error === 'EXPIRED'"
        :to="{ name: 'kalo_billing' }"
        data-test-id="kalo-assistant-billing-link"
        class="font-semibold underline"
        @click="emit('close')"
      >
        {{ t('KALO_ASSISTANT.BILLING_LINK') }}
      </router-link>
    </div>

    <template #footer>
      <form class="flex items-end gap-2" @submit.prevent="submit()">
        <textarea
          v-model="draft"
          autofocus
          rows="2"
          maxlength="2000"
          data-test-id="kalo-assistant-input"
          :aria-label="t('KALO_ASSISTANT.INPUT_LABEL')"
          :placeholder="t('KALO_ASSISTANT.PLACEHOLDER')"
          class="flex-1 min-w-0 !mb-0 text-sm resize-none"
          @keydown.enter="onEnter"
        />
        <button
          type="submit"
          data-test-id="kalo-assistant-send"
          :disabled="isLoading || !draft.trim()"
          :aria-label="t('KALO_ASSISTANT.SEND')"
          :title="t('KALO_ASSISTANT.SEND')"
          class="grid text-white rounded-xl size-10 shrink-0 place-content-center bg-n-brand hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-n-brand"
        >
          <KaloIcon name="send" class="size-5" />
        </button>
      </form>
      <p class="mt-2 text-xs text-n-slate-11">
        {{ t('KALO_ASSISTANT.DISCLAIMER') }}
      </p>
    </template>
  </KaloDrawer>
</template>
