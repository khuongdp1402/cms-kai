<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';

const emit = defineEmits(['navigate']);

const { t } = useI18n();
const route = useRoute();
const { accountScopedRoute } = useAccount();

// Lists that only have a route (chat-parity C-07): all, mentions, unattended, participating.
const VIEWS = [
  { key: 'ALL', route: 'home', match: ['home'] },
  {
    key: 'MENTIONS',
    route: 'conversation_mentions',
    match: ['conversation_mentions', 'conversation_through_mentions'],
  },
  {
    key: 'UNATTENDED',
    route: 'conversation_unattended',
    match: ['conversation_unattended', 'conversation_through_unattended'],
  },
  {
    key: 'PARTICIPATING',
    route: 'conversation_participating',
    match: ['conversation_participating', 'conversation_through_participating'],
  },
];

const views = computed(() =>
  VIEWS.map(view => ({
    ...view,
    to: accountScopedRoute(view.route),
    active: view.match.includes(route.name),
  }))
);
</script>

<template>
  <div class="flex flex-col gap-0.5" data-test-id="kalo-quick-views">
    <router-link
      v-for="view in views"
      :key="view.key"
      :to="view.to"
      :data-test-id="`kalo-quick-view-${view.key.toLowerCase()}`"
      :aria-current="view.active ? 'page' : undefined"
      class="flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors duration-150 motion-reduce:transition-none"
      :class="
        view.active
          ? 'bg-n-blue-3 text-n-blue-11 font-medium'
          : 'text-n-slate-12 hover:bg-n-alpha-2'
      "
      @click="emit('navigate')"
    >
      {{ t(`KALO_CHAT_LIST.VIEWS.${view.key}`) }}
    </router-link>
  </div>
</template>
