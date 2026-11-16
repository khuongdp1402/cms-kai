<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import KaloIcon from 'next/icon/KaloIcon.vue';
import SidebarNotificationBell from './SidebarNotificationBell.vue';
import SidebarAccountSwitcher from './SidebarAccountSwitcher.vue';
import SidebarProfileMenu from './SidebarProfileMenu.vue';

const emit = defineEmits([
  'openKeyShortcutModal',
  'closeKeyShortcutModal',
  'showCreateAccountModal',
]);

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
  <div class="flex flex-col items-center gap-1" data-test-id="kalo-rail-footer">
    <SidebarNotificationBell
      @open-notification-panel="router.push({ name: 'notifications_index' })"
    />
    <button
      type="button"
      data-test-id="kalo-search"
      :title="t('KALO_NAV.SEARCH')"
      class="grid size-8 rounded-lg place-content-center hover:bg-n-alpha-1"
      @click="router.push({ name: 'search' })"
    >
      <KaloIcon name="search" class="size-5" />
    </button>
    <SidebarAccountSwitcher
      v-if="showAccountMenu"
      is-collapsed
      @show-create-account-modal="emit('showCreateAccountModal')"
    />
    <SidebarProfileMenu
      is-collapsed
      @open-key-shortcut-modal="emit('openKeyShortcutModal')"
    />
  </div>
</template>
