<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import Logo from 'next/icon/Logo.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloMessageFilters from './KaloMessageFilters.vue';
import { useSidebarKeyboardShortcuts } from './useSidebarKeyboardShortcuts';
import KaloRailFooter from './KaloRailFooter.vue';
import KaloRailTooltip from './KaloRailTooltip.vue';
import KaloAssistantButton from 'next/assistant/KaloAssistantButton.vue';
import KaloGuideNav from 'next/guide/KaloGuideNav.vue';
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

// Persisted per user in uiSettings (falls back to local state without the store).
const setExpanded = next => {
  localExpanded.value = next;
  if (hasUISettingsStore.value) {
    const current = store.getters.getUISettings || {};
    store.dispatch('updateUISettings', {
      uiSettings: { ...current, is_kalo_rail_expanded: next },
    });
  }
};

const toggleRail = () => setExpanded(!isExpanded.value);

useSidebarKeyboardShortcuts(show => {
  if (show) emit('openKeyShortcutModal');
  else emit('closeKeyShortcutModal');
}, toggleRail);

// Submenus (Tin nhắn filters): hidden while collapsed, shown under the parent
// when expanded. The submenu of the active item starts open.
const openSubmenus = ref(new Set());
const isSubmenuOpen = key => isExpanded.value && openSubmenus.value.has(key);
const setSubmenu = (key, open) => {
  const next = new Set(openSubmenus.value);
  if (open) next.add(key);
  else next.delete(key);
  openSubmenus.value = next;
};
const toggleSubmenu = key => setSubmenu(key, !openSubmenus.value.has(key));

watch(
  () => items.value.find(item => item.hasSubmenu && item.active)?.key,
  key => {
    if (key) setSubmenu(key, true);
  },
  { immediate: true }
);

const onItemClick = item => {
  if (!item.hasSubmenu || isExpanded.value) return;
  setExpanded(true);
  setSubmenu(item.key, true);
};

const showAccountBadge = computed(() => (userAccounts.value || []).length > 1);
const activeShopName = computed(
  () =>
    currentAccount.value?.name ||
    (userAccounts.value || []).find(a => a.id === accountId.value)?.name ||
    ''
);

const toggleLabel = computed(() =>
  isExpanded.value ? t('KALO_NAV.TOGGLE_COLLAPSE') : t('KALO_NAV.TOGGLE_EXPAND')
);

const shouldRenderSectionHeading = (list, item, index) => {
  if (!isExpanded.value || !item.sectionKey) return false;
  if (index === 0) return true;
  return list[index - 1]?.sectionKey !== item.sectionKey;
};

const railGroups = computed(() => [
  { key: 'main', items: items.value.filter(item => !item.footer) },
  { key: 'pinned', items: items.value.filter(item => item.footer) },
]);
</script>

<template>
  <nav
    :aria-label="t('KALO_NAV.MAIN_NAV')"
    :data-expanded="isExpanded ? 'true' : 'false'"
    class="relative z-30 flex flex-col shrink-0 gap-1 py-3.5 [@media(max-height:800px)]:py-2 bg-n-surface-1 border-r border-n-weak transition-[width] duration-200 ease-out"
    :class="
      isExpanded ? 'w-[224px] px-3 items-stretch' : 'w-[68px] items-center'
    "
  >
    <!-- Collapse / expand at the sidebar / page header junction. -->
    <button
      type="button"
      data-test-id="kalo-rail-toggle"
      :aria-expanded="isExpanded"
      :title="toggleLabel"
      :aria-label="toggleLabel"
      class="absolute z-40 grid border rounded-full shadow-sm top-[21px] ltr:-right-3 rtl:-left-3 size-6 place-content-center bg-n-solid-1 border-n-strong text-n-slate-11 hover:text-n-slate-12 hover:bg-n-solid-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
      @click="toggleRail"
    >
      <KaloIcon
        name="chevron"
        class="size-3.5"
        :class="
          isExpanded ? 'rotate-90 rtl:-rotate-90' : '-rotate-90 rtl:rotate-90'
        "
      />
    </button>

    <div
      class="flex items-center min-w-0 gap-2 shrink-0"
      :class="isExpanded ? 'px-1 pb-2.5 mb-1 border-b border-n-weak' : 'mb-1'"
    >
      <Logo class="size-9 shrink-0" />
      <div v-if="isExpanded" class="flex flex-col min-w-0">
        <span class="text-sm font-extrabold leading-tight text-n-slate-12">
          {{ t('KALO_NAV.BRAND_NAME') }}
        </span>
        <span
          v-if="activeShopName"
          data-test-id="kalo-active-shop"
          class="text-[11px] font-medium truncate text-n-slate-10"
        >
          {{ activeShopName }}
        </span>
      </div>
      <span
        v-else-if="showAccountBadge && activeShopName"
        class="sr-only"
        data-test-id="kalo-active-shop"
      >
        {{ activeShopName }}
      </span>
    </div>

    <!-- Main items scroll at short heights; the footer group below never
         scrolls, so it cannot overlap the bell or leave the screen. -->
    <div
      v-for="group in railGroups"
      :key="group.key"
      :data-test-id="`kalo-rail-${group.key}`"
      class="flex flex-col gap-1 [@media(max-height:800px)]:gap-0.5"
      :class="[
        group.key === 'main'
          ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]'
          : 'shrink-0 pt-1',
        isExpanded ? '' : 'items-center w-full',
      ]"
    >
      <template v-if="group.key === 'pinned'">
        <KaloGuideNav :is-expanded="isExpanded" />
        <!-- Spec §4 footer order: Trợ lý AI, Console/Cài đặt, Thông báo, Hồ sơ. -->
        <KaloAssistantButton :is-expanded="isExpanded" />
      </template>
      <template v-for="(item, index) in group.items" :key="item.key">
        <p
          v-if="shouldRenderSectionHeading(group.items, item, index)"
          class="px-2.5 pt-2 pb-0.5 mb-0 text-[10.5px] font-bold tracking-wider uppercase text-n-slate-10"
        >
          {{ t(item.sectionKey) }}
        </p>
        <KaloRailTooltip
          :label="t(item.labelKey)"
          :enabled="!isExpanded"
          :class="{ 'w-full': isExpanded }"
        >
          <div class="flex items-center gap-0.5">
            <router-link
              :to="item.to"
              :data-test-id="`kalo-nav-${item.key}`"
              :aria-current="item.active ? 'page' : undefined"
              class="relative flex items-center transition-colors duration-150 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
              :class="[
                isExpanded
                  ? 'flex-1 min-w-0 gap-2.5 px-3 py-2 text-sm font-semibold'
                  : 'justify-center size-11 [@media(max-height:800px)]:size-10',
                item.active
                  ? 'bg-n-blue-3 text-n-blue-11 font-semibold'
                  : 'text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12',
              ]"
              @click="onItemClick(item)"
            >
              <KaloIcon
                :name="item.icon"
                :class="isExpanded ? 'size-5 shrink-0' : 'size-6'"
              />
              <span :class="isExpanded ? 'truncate' : 'sr-only'">
                {{ t(item.labelKey) }}
              </span>
              <span
                v-if="item.badge > 0"
                data-test-id="kalo-badge"
                class="px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9 tabular-nums"
                :class="
                  isExpanded
                    ? 'ltr:ml-auto rtl:mr-auto'
                    : 'absolute -top-0.5 ltr:-right-1 rtl:-left-1'
                "
              >
                {{ item.badge > 99 ? '99+' : item.badge }}
              </span>
            </router-link>
            <button
              v-if="item.hasSubmenu && isExpanded"
              type="button"
              data-test-id="kalo-filters-trigger"
              :aria-expanded="isSubmenuOpen(item.key)"
              :aria-label="t('KALO_NAV.FILTERS.OPEN')"
              :title="t('KALO_NAV.FILTERS.OPEN')"
              class="grid rounded-lg size-8 shrink-0 place-content-center text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="toggleSubmenu(item.key)"
            >
              <KaloIcon
                name="chevron"
                class="transition-transform size-4"
                :class="{ 'rotate-180': isSubmenuOpen(item.key) }"
              />
            </button>
          </div>
          <KaloMessageFilters
            v-if="item.key === 'messages' && isSubmenuOpen(item.key)"
            nested
          />
        </KaloRailTooltip>
      </template>
    </div>

    <KaloRailFooter
      :is-expanded="isExpanded"
      @open-key-shortcut-modal="emit('openKeyShortcutModal')"
      @show-create-account-modal="emit('showCreateAccountModal')"
    />
  </nav>
</template>
