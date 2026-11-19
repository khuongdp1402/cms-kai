<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter } from 'dashboard/composables/store';
import KaloIcon from 'next/icon/KaloIcon.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';

defineProps({
  inline: { type: Boolean, default: false },
  // Submenu under "Tin nhắn" in the expanded rail (implies inline).
  nested: { type: Boolean, default: false },
});

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const inboxes = useMapGetter('inboxes/getInboxes');
const labels = useMapGetter('labels/getLabelsOnSidebar');
const teams = useMapGetter('teams/getMyTeams');
const folders = useMapGetter('customViews/getConversationCustomViews');

const isOpen = ref(false);
const closePanel = () => {
  isOpen.value = false;
};
// ComposeConversation teleports its popover to body (see popover/Popover.vue).
const clickOutsideIgnore = ['[data-popover-content]'];

const sections = computed(() =>
  [
    {
      key: 'INBOXES',
      links: inboxes.value.map(inbox => ({
        id: inbox.id,
        label: inbox.name,
        to: accountScopedRoute('inbox_dashboard', { inbox_id: inbox.id }),
      })),
    },
    {
      key: 'LABELS',
      links: labels.value.map(label => ({
        id: label.id,
        label: label.title,
        to: accountScopedRoute('label_conversations', { label: label.title }),
      })),
    },
    {
      key: 'TEAMS',
      links: teams.value.map(team => ({
        id: team.id,
        label: team.name,
        to: accountScopedRoute('team_conversations', { teamId: team.id }),
      })),
    },
    {
      key: 'FOLDERS',
      links: folders.value.map(view => ({
        id: view.id,
        label: view.name,
        to: accountScopedRoute('folder_conversations', { id: view.id }),
      })),
    },
  ].filter(section => section.links.length)
);
</script>

<template>
  <div
    v-on-click-outside="[closePanel, { ignore: clickOutsideIgnore }]"
    class="relative"
    data-test-id="kalo-message-filters"
  >
    <button
      v-if="!inline && !nested"
      type="button"
      data-test-id="kalo-filters-trigger"
      :title="t('KALO_NAV.FILTERS.OPEN')"
      :aria-expanded="isOpen"
      class="grid size-6 rounded-md place-content-center text-n-slate-10 hover:bg-n-alpha-2"
      @click="isOpen = !isOpen"
    >
      <span class="i-lucide-chevron-down size-4" />
    </button>
    <div
      v-if="nested"
      data-test-id="kalo-filters-submenu"
      class="flex flex-col gap-2 py-1 mt-0.5 ltr:ml-5 rtl:mr-5 ltr:pl-2 rtl:pr-2 ltr:border-l rtl:border-r border-n-weak max-h-72 overflow-y-auto"
    >
      <ComposeConversation align="start">
        <template #trigger>
          <button
            type="button"
            data-test-id="kalo-new-conversation"
            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium rounded-lg text-n-blue-11 hover:bg-n-alpha-2"
          >
            <KaloIcon name="plus" class="size-4" />
            {{ t('KALO_NAV.FILTERS.NEW_CONVERSATION') }}
          </button>
        </template>
      </ComposeConversation>
      <div v-for="section in sections" :key="section.key">
        <h3
          class="px-2 mb-0.5 text-[11px] font-bold tracking-wider uppercase text-n-slate-10"
        >
          {{ t(`KALO_NAV.FILTERS.${section.key}`) }}
        </h3>
        <router-link
          v-for="link in section.links"
          :key="link.id"
          :to="link.to"
          class="block px-2 py-1 text-sm truncate rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
          exact-active-class="!bg-n-blue-3 !text-n-blue-11 font-semibold"
        >
          {{ link.label }}
        </router-link>
      </div>
    </div>
    <div
      v-else-if="inline || isOpen"
      class="flex flex-col gap-3 p-3 overflow-y-auto max-h-80 bg-n-surface-1 border border-n-weak rounded-xl"
      :class="inline ? '' : 'absolute z-50 left-full top-0 ml-2 w-64 shadow-lg'"
    >
      <ComposeConversation align="start">
        <template #trigger>
          <button
            type="button"
            data-test-id="kalo-new-conversation"
            class="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium rounded-lg text-n-blue-11 hover:bg-n-alpha-2"
          >
            <KaloIcon name="plus" class="size-5" />
            {{ t('KALO_NAV.FILTERS.NEW_CONVERSATION') }}
          </button>
        </template>
      </ComposeConversation>
      <div v-for="section in sections" :key="section.key">
        <h3 class="mb-1 px-2 text-xs font-semibold text-n-slate-10">
          {{ t(`KALO_NAV.FILTERS.${section.key}`) }}
        </h3>
        <router-link
          v-for="link in section.links"
          :key="link.id"
          :to="link.to"
          class="block px-2 py-1.5 text-sm truncate rounded-lg text-n-slate-12 hover:bg-n-alpha-2"
          @click="isOpen = false"
        >
          {{ link.label }}
        </router-link>
      </div>
    </div>
  </div>
</template>
