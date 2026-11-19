<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStoreGetters } from 'dashboard/composables/store';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloSetupChecklist from 'next/guide/KaloSetupChecklist.vue';

defineProps({
  // Line under the greeting, e.g. "pick a conversation"; the default explains the steps.
  message: { type: String, default: '' },
});

const getters = useStoreGetters();
const { t } = useI18n();

const currentUser = computed(() => getters.getCurrentUser.value);

const greetingMessage = computed(() => {
  const hours = new Date().getHours();
  let key = 'EVENING';
  if (hours < 12) key = 'MORNING';
  else if (hours < 18) key = 'AFTERNOON';
  return t(`KALO_CHAT_LIST.WELCOME.GREETING_${key}`, {
    name: currentUser.value.name,
  });
});
</script>

<template>
  <div
    data-test-id="kalo-chat-welcome"
    class="flex flex-col items-center w-full max-w-xl gap-6 px-6 py-10 mx-auto text-center"
  >
    <div aria-hidden="true" class="relative size-28">
      <span
        class="absolute inset-0 grid rounded-[2rem] bg-n-blue-2 place-items-center text-n-blue-9"
      >
        <KaloIcon name="msg" class="size-14" />
      </span>
      <span
        class="absolute grid -rotate-12 rounded-xl shadow-md -top-3 -start-4 size-11 bg-n-surface-1 place-items-center text-n-blue-9 motion-safe:animate-bounce [animation-duration:2.6s]"
      >
        <KaloIcon name="bag" class="size-6" />
      </span>
      <span
        class="absolute grid rotate-12 rounded-xl shadow-md -bottom-2 -end-4 size-10 bg-n-surface-1 place-items-center text-n-blue-9"
      >
        <KaloIcon name="spark" class="size-5" />
      </span>
    </div>
    <div class="flex flex-col gap-1.5">
      <h2 class="text-xl font-extrabold text-n-slate-12">
        {{ greetingMessage }}
      </h2>
      <p class="text-sm text-n-slate-11">
        {{ message || t('KALO_CHAT_LIST.WELCOME.SUBTITLE') }}
      </p>
    </div>
    <!-- The one setup checklist (spec §3.1); hidden for staff and once dismissed. -->
    <KaloSetupChecklist variant="compact" />
  </div>
</template>
