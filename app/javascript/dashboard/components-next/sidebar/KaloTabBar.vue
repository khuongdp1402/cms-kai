<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { onKeyStroke } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import Auth from 'dashboard/api/auth';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloDrawer from 'next/layout/KaloDrawer.vue';
import KaloAssistantButton from 'next/assistant/KaloAssistantButton.vue';
import KaloGuideNav from 'next/guide/KaloGuideNav.vue';
import SidebarAccountSwitcher from './SidebarAccountSwitcher.vue';
import KaloMessageFilters from './KaloMessageFilters.vue';
import { useSidebarKeyboardShortcuts } from './useSidebarKeyboardShortcuts';
import { useKaloNav } from './useKaloNav';

const emit = defineEmits([
  'openKeyShortcutModal',
  'closeKeyShortcutModal',
  'showCreateAccountModal',
]);

useSidebarKeyboardShortcuts(show => {
  if (show) emit('openKeyShortcutModal');
  else emit('closeKeyShortcutModal');
});

const PRIMARY_KEYS = ['messages', 'orders', 'customers', 'reports'];

const { t } = useI18n();
const route = useRoute();
const { items } = useKaloNav();

const userAccounts = useMapGetter('getUserAccounts');
const globalConfig = useMapGetter('globalConfig/get');
const hasManyAccounts = computed(() => userAccounts.value.length > 1);
const showAccountMenu = computed(
  () =>
    hasManyAccounts.value || !!globalConfig.value.createNewAccountFromDashboard
);
const currentUser = useMapGetter('getCurrentUser');
const accountLinks = computed(() => [
  { key: 'notifications', icon: 'bell', name: 'notifications_index' },
  { key: 'search', icon: 'search', name: 'search' },
  { key: 'profile', icon: 'user', name: 'profile_settings_index' },
  // Platform pages (/app/platform) for the platform owner only.
  ...(currentUser.value?.type === 'SuperAdmin'
    ? [
        {
          key: 'platform',
          icon: 'lock',
          name: 'kalo_platform_overview',
          labelKey: 'KALO_CONSOLE_SHOP.NAV.PLATFORM',
        },
      ]
    : []),
]);

const isSheetOpen = ref(false);
const sheetRowClass =
  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl';
const sheetIconClass = 'grid size-8 shrink-0 place-content-center';
// Tab order follows PRIMARY_KEYS, not the sidebar order.
const primaryItems = computed(() =>
  PRIMARY_KEYS.map(key => items.value.find(item => item.key === key)).filter(
    Boolean
  )
);
const sheetItems = computed(() =>
  items.value.filter(item => !PRIMARY_KEYS.includes(item.key))
);
const isMoreActive = computed(() => sheetItems.value.some(i => i.active));

onKeyStroke('Escape', () => {
  isSheetOpen.value = false;
});

watch(
  () => route.fullPath,
  () => {
    isSheetOpen.value = false;
  }
);
</script>

<template>
  <nav
    :aria-label="t('KALO_NAV.MAIN_NAV')"
    class="relative flex justify-around shrink-0 px-1.5 pt-2 pb-5 bg-n-surface-1 border-t border-n-weak"
  >
    <KaloDrawer
      v-if="isSheetOpen"
      data-test-id="kalo-more-sheet"
      placement="bottom"
      :title="t('KALO_NAV.MORE')"
      :aria-label="t('KALO_NAV.MORE')"
      @close="isSheetOpen = false"
    >
      <div class="flex flex-col -mx-2 -my-2">
        <KaloGuideNav variant="sheet" />
        <router-link
          v-for="item in sheetItems"
          :key="item.key"
          :to="item.to"
          :aria-current="item.active ? 'page' : undefined"
          :class="[
            sheetRowClass,
            item.active
              ? 'bg-n-blue-3 text-n-blue-11'
              : 'text-n-slate-12 hover:bg-n-alpha-2',
          ]"
        >
          <span :class="sheetIconClass">
            <KaloIcon :name="item.icon" class="size-5" />
          </span>
          {{ t(item.labelKey) }}
        </router-link>
        <KaloAssistantButton variant="sheet" />
        <router-link
          v-for="link in accountLinks"
          :key="link.key"
          :to="{ name: link.name }"
          :data-test-id="`kalo-sheet-${link.key}`"
          class="text-n-slate-12 hover:bg-n-alpha-2"
          :class="[sheetRowClass]"
        >
          <span :class="sheetIconClass">
            <KaloIcon :name="link.icon" class="size-5" />
          </span>
          {{ t(link.labelKey || `KALO_NAV.${link.key.toUpperCase()}`) }}
        </router-link>
        <div
          v-if="showAccountMenu"
          data-test-id="kalo-sheet-switch-account"
          class="text-n-slate-12"
          :class="[sheetRowClass]"
        >
          <span :class="sheetIconClass">
            <SidebarAccountSwitcher
              is-collapsed
              @show-create-account-modal="$emit('showCreateAccountModal')"
            />
          </span>
          {{
            t(
              hasManyAccounts
                ? 'KALO_NAV.SWITCH_ACCOUNT'
                : 'KALO_NAV.NEW_ACCOUNT'
            )
          }}
        </div>
        <button
          type="button"
          data-test-id="kalo-sheet-logout"
          class="w-full text-start text-n-ruby-11 hover:bg-n-ruby-3/50"
          :class="[sheetRowClass]"
          @click="Auth.logout()"
        >
          <span :class="sheetIconClass">
            <KaloIcon name="logout" class="size-5" />
          </span>
          {{ t('KALO_NAV.LOGOUT') }}
        </button>
        <div class="px-2 pt-3 mt-2 border-t border-n-weak">
          <KaloMessageFilters inline />
        </div>
      </div>
    </KaloDrawer>
    <router-link
      v-for="item in primaryItems"
      :key="item.key"
      :to="item.to"
      :data-test-id="`kalo-tab-${item.key}`"
      :aria-current="item.active ? 'page' : undefined"
      class="relative flex flex-col items-center w-16 gap-0.5 text-xs font-medium"
      :class="item.active ? 'text-n-blue-11' : 'text-n-slate-10'"
    >
      <KaloIcon :name="item.icon" class="size-6" />
      {{ t(item.labelKey) }}
      <span
        v-if="item.badge > 0"
        data-test-id="kalo-badge"
        class="absolute -top-1 right-3 px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9"
      >
        {{ item.badge > 99 ? '99+' : item.badge }}
      </span>
    </router-link>
    <button
      type="button"
      data-test-id="kalo-tab-more"
      :aria-expanded="isSheetOpen"
      class="flex flex-col items-center w-16 gap-0.5 text-xs font-medium"
      :class="isMoreActive ? 'text-n-blue-11' : 'text-n-slate-10'"
      @click="isSheetOpen = !isSheetOpen"
    >
      <KaloIcon name="more" class="size-6" />
      {{ t('KALO_NAV.MORE') }}
    </button>
  </nav>
</template>
