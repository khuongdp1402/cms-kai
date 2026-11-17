<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStoreGetters } from 'dashboard/composables/store';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloIcon from 'next/icon/KaloIcon.vue';

defineProps({
  // Line under the greeting, e.g. "pick a conversation"; the default explains the steps.
  message: { type: String, default: '' },
});

const getters = useStoreGetters();
const { t } = useI18n();
const { isAdmin } = useAdmin();
const { accountScopedRoute } = useAccount();

const currentUser = computed(() => getters.getCurrentUser.value);
const hasInboxes = computed(
  () => getters['inboxes/getInboxes'].value.length > 0
);

const greetingMessage = computed(() => {
  const hours = new Date().getHours();
  let key = 'EVENING';
  if (hours < 12) key = 'MORNING';
  else if (hours < 18) key = 'AFTERNOON';
  return t(`KALO_CHAT_LIST.WELCOME.GREETING_${key}`, {
    name: currentUser.value.name,
  });
});

const steps = computed(() =>
  [
    isAdmin.value && {
      key: 'CHANNEL',
      icon: 'plug',
      to: accountScopedRoute('settings_inbox_new'),
      done: hasInboxes.value,
    },
    { key: 'PRODUCT', icon: 'tag', to: accountScopedRoute('kalo_pos') },
    { key: 'ORDER', icon: 'bag', to: accountScopedRoute('kalo_orders') },
  ].filter(Boolean)
);
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
    <ol class="grid w-full gap-2.5 p-0 m-0 list-none text-start">
      <li v-for="step in steps" :key="step.key" class="m-0">
        <router-link
          :to="step.to"
          :data-test-id="`kalo-welcome-step-${step.key.toLowerCase()}`"
          class="flex items-center gap-3 p-3.5 border rounded-2xl border-n-weak bg-n-surface-1 transition duration-150 motion-reduce:transition-none hover:border-n-blue-6 hover:shadow-md group"
        >
          <span
            class="grid rounded-xl size-10 shrink-0 place-items-center"
            :class="
              step.done
                ? 'bg-n-teal-3 text-n-teal-11'
                : 'bg-n-blue-3 text-n-blue-11'
            "
          >
            <KaloIcon :name="step.done ? 'check' : step.icon" class="size-5" />
          </span>
          <span class="flex flex-col flex-1 min-w-0">
            <span class="text-sm font-semibold text-n-slate-12">
              {{ t(`KALO_CHAT_LIST.WELCOME.STEPS.${step.key}.TITLE`) }}
            </span>
            <span class="text-xs text-n-slate-11">
              {{
                step.done
                  ? t('KALO_CHAT_LIST.WELCOME.STEPS.DONE')
                  : t(`KALO_CHAT_LIST.WELCOME.STEPS.${step.key}.DESC`)
              }}
            </span>
          </span>
          <KaloIcon
            name="arrow"
            class="size-4 text-n-slate-10 transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5 rtl:rotate-180"
          />
        </router-link>
      </li>
    </ol>
  </div>
</template>
