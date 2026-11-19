<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import KaloIcon from 'next/icon/KaloIcon.vue';
import SidebarNotificationBell from './SidebarNotificationBell.vue';
import SidebarAccountSwitcher from './SidebarAccountSwitcher.vue';
import SidebarProfileMenu from './SidebarProfileMenu.vue';

defineProps({
  isExpanded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['openKeyShortcutModal', 'showCreateAccountModal']);

const { t } = useI18n();
const router = useRouter();
const userAccounts = useMapGetter('getUserAccounts');
const globalConfig = useMapGetter('globalConfig/get');
const showAccountMenu = computed(
  () =>
    userAccounts.value.length > 1 ||
    !!globalConfig.value.createNewAccountFromDashboard
);
</script>

<template>
  <div
    class="flex flex-col gap-1 pt-2 border-t border-n-weak"
    :class="isExpanded ? 'w-full items-stretch' : 'items-center'"
    data-test-id="kalo-rail-footer"
  >
    <div
      class="flex items-center gap-1"
      :class="isExpanded ? 'px-1 justify-start' : 'flex-col'"
    >
      <SidebarNotificationBell
        @open-notification-panel="router.push({ name: 'notifications_index' })"
      />
      <button
        type="button"
        data-test-id="kalo-search"
        :title="t('KALO_NAV.SEARCH')"
        class="grid rounded-lg place-content-center hover:bg-n-alpha-1 text-n-slate-11"
        :class="
          isExpanded
            ? 'flex-1 h-8 px-2 !flex items-center justify-start gap-2 text-xs font-medium'
            : 'size-8'
        "
        @click="router.push({ name: 'search' })"
      >
        <KaloIcon name="search" class="size-5 shrink-0" />
        <span v-if="isExpanded" class="truncate">
          {{ t('KALO_NAV.SEARCH') }}
        </span>
      </button>
    </div>
    <SidebarAccountSwitcher
      v-if="showAccountMenu"
      :is-collapsed="!isExpanded"
      @show-create-account-modal="emit('showCreateAccountModal')"
    />
    <SidebarProfileMenu
      :is-collapsed="!isExpanded"
      @open-key-shortcut-modal="emit('openKeyShortcutModal')"
    />
  </div>
</template>
