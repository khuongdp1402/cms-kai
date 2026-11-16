<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'next/icon/KaloIcon.vue';
import { useKaloNav } from './useKaloNav';

const PRIMARY_KEYS = ['messages', 'orders', 'customers', 'reports'];

const { t } = useI18n();
const route = useRoute();
const { items } = useKaloNav();

const isSheetOpen = ref(false);
const primaryItems = computed(() =>
  items.value.filter(item => PRIMARY_KEYS.includes(item.key))
);
const sheetItems = computed(() =>
  items.value.filter(item => !PRIMARY_KEYS.includes(item.key))
);
const isMoreActive = computed(() => sheetItems.value.some(i => i.active));

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
    <div
      v-if="isSheetOpen"
      data-test-id="kalo-more-sheet"
      class="absolute bottom-full inset-x-0 flex flex-col p-2 bg-n-surface-1 border-t border-n-weak shadow-lg"
    >
      <router-link
        v-for="item in sheetItems"
        :key="item.key"
        :to="item.to"
        :aria-current="item.active ? 'page' : undefined"
        class="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl"
        :class="item.active ? 'bg-n-blue-3 text-n-blue-11' : 'text-n-slate-12'"
      >
        <KaloIcon :name="item.icon" class="size-6" />
        {{ t(item.labelKey) }}
      </router-link>
    </div>
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
