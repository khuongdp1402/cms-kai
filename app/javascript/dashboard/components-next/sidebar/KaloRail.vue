<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import Logo from 'next/icon/Logo.vue';
import Icon from 'next/icon/Icon.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloMessageFilters from './KaloMessageFilters.vue';
import { useSidebarKeyboardShortcuts } from './useSidebarKeyboardShortcuts';
import KaloRailFooter from './KaloRailFooter.vue';
import { useKaloNav } from './useKaloNav';

const emit = defineEmits([
  'openKeyShortcutModal',
  'closeKeyShortcutModal',
  'showCreateAccountModal',
]);

const { t } = useI18n();
const route = useRoute();
const store = useStore();
const { items } = useKaloNav();
const { accountId, currentAccount } = useAccount();
const userAccounts = useMapGetter('getUserAccounts');

const localExpanded = ref(false);
const hasUISettingsStore = computed(() => 'getUISettings' in store.getters);

const isExpanded = computed(() => {
  if (route.name === 'kalo_pos') return false;
  if (hasUISettingsStore.value) {
    const val = store.getters.getUISettings?.is_kalo_rail_expanded;
    if (typeof val === 'boolean') return val;
  }
  return localExpanded.value;
});

const toggleRail = () => {
  const next = !isExpanded.value;
  localExpanded.value = next;
  if (hasUISettingsStore.value) {
    const current = store.getters.getUISettings || {};
    store.dispatch('updateUISettings', {
      uiSettings: { ...current, is_kalo_rail_expanded: next },
    });
  }
};

useSidebarKeyboardShortcuts(
  show => {
    if (show) emit('openKeyShortcutModal');
    else emit('closeKeyShortcutModal');
  },
  toggleRail
);

const showAccountBadge = computed(() => (userAccounts.value || []).length > 1);
const activeShopName = computed(
  () =>
    currentAccount.value?.name ||
    (userAccounts.value || []).find(a => a.id === accountId.value)?.name ||
    ''
);

const shouldRenderSectionHeading = (item, index) => {
  if (!isExpanded.value || !item.sectionKey) return false;
  if (index === 0) return true;
  return items.value[index - 1]?.sectionKey !== item.sectionKey;
};
</script>

<template>
  <nav
    :aria-label="t('KALO_NAV.MAIN_NAV')"
    :data-expanded="isExpanded ? 'true' : 'false'"
    class="relative z-30 flex flex-col shrink-0 gap-1 py-3.5 bg-n-surface-1 border-r border-n-weak transition-[width] duration-200 ease-out"
    :class="isExpanded ? 'w-[224px] px-3 items-stretch' : 'w-[76px] items-center'"
  >
    <div
      class="flex items-center gap-2 shrink-0"
      :class="
        isExpanded
          ? 'justify-between px-1 pb-2.5 mb-1 border-b border-n-weak'
          : 'flex-col mb-1'
      "
    >
      <div class="flex items-center min-w-0 gap-2">
        <Logo class="size-9 shrink-0" />
        <div v-if="isExpanded" class="flex flex-col min-w-0">
          <span class="text-sm font-extrabold leading-tight text-n-slate-12">
            {{ t('KALO_NAV.BRAND_NAME') }}
          </span>
          <span
            v-if="activeShopName"
            class="text-[11px] font-medium truncate text-n-slate-10"
          >
            {{ activeShopName }}
          </span>
        </div>
      </div>
      <button
        type="button"
        data-test-id="kalo-rail-toggle"
        :aria-expanded="isExpanded"
        :title="
          isExpanded
            ? t('KALO_NAV.TOGGLE_COLLAPSE')
            : t('KALO_NAV.TOGGLE_EXPAND')
        "
        :aria-label="
          isExpanded
            ? t('KALO_NAV.TOGGLE_COLLAPSE')
            : t('KALO_NAV.TOGGLE_EXPAND')
        "
        class="grid rounded-lg size-7 shrink-0 place-content-center text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12"
        @click="toggleRail"
      >
        <Icon
          :icon="
            isExpanded
              ? 'i-lucide-panel-left-close'
              : 'i-lucide-panel-left-open'
          "
          class="size-4"
        />
      </button>
    </div>

    <span
      v-if="!isExpanded && showAccountBadge && activeShopName"
      data-test-id="kalo-active-shop"
      :title="activeShopName"
      class="max-w-[64px] truncate px-1.5 py-0.5 mb-1 text-[10px] font-semibold rounded-md bg-n-alpha-1 text-n-slate-11"
    >
      {{ activeShopName }}
    </span>

    <template v-for="(item, index) in items" :key="item.key">
      <div v-if="item.key === 'settings'" class="flex-1" />
      <p
        v-if="shouldRenderSectionHeading(item, index)"
        class="px-2.5 pt-2 pb-0.5 mb-0 text-[10.5px] font-bold tracking-wider uppercase text-n-slate-10"
      >
        {{ t(item.sectionKey) }}
      </p>
      <div class="relative" :class="{ 'w-full': isExpanded }">
        <router-link
          :to="item.to"
          :data-test-id="`kalo-nav-${item.key}`"
          :aria-current="item.active ? 'page' : undefined"
          :title="!isExpanded ? t(item.labelKey) : undefined"
          class="relative flex items-center transition-colors duration-150 rounded-xl"
          :class="[
            isExpanded
              ? 'w-full gap-2.5 px-3 py-2 text-sm font-semibold'
              : 'flex-col w-[60px] gap-0.5 pt-2 pb-1.5 text-xs font-medium',
            item.active
              ? 'bg-n-blue-3 text-n-blue-11 font-semibold'
              : 'text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12',
          ]"
        >
          <KaloIcon
            :name="item.icon"
            :class="isExpanded ? 'size-5 shrink-0' : 'size-6'"
          />
          <span :class="{ truncate: isExpanded }">
            {{ t(item.labelKey) }}
          </span>
          <span
            v-if="item.badge > 0"
            data-test-id="kalo-badge"
            class="px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9 tabular-nums"
            :class="
              isExpanded
                ? 'ltr:ml-auto rtl:mr-auto'
                : 'absolute top-1 right-2.5'
            "
          >
            {{ item.badge > 99 ? '99+' : item.badge }}
          </span>
        </router-link>
        <div
          v-if="item.key === 'messages'"
          class="absolute -translate-y-1/2 top-1/2"
          :class="isExpanded ? 'right-1' : '-right-2'"
        >
          <KaloMessageFilters />
        </div>
      </div>
    </template>

    <KaloRailFooter
      :is-expanded="isExpanded"
      @open-key-shortcut-modal="emit('openKeyShortcutModal')"
      @show-create-account-modal="emit('showCreateAccountModal')"
    />
  </nav>
</template>
