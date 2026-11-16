<script setup>
import { useI18n } from 'vue-i18n';
import Logo from 'next/icon/Logo.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloRailFooter from './KaloRailFooter.vue';
import { useKaloNav } from './useKaloNav';

defineEmits(['openKeyShortcutModal', 'showCreateAccountModal']);

const { t } = useI18n();
const { items } = useKaloNav();
</script>

<template>
  <nav
    :aria-label="t('KALO_NAV.MAIN_NAV')"
    class="flex flex-col items-center w-[76px] shrink-0 gap-1 py-3.5 bg-n-surface-1 border-r border-n-weak"
  >
    <Logo class="size-9 mb-3" />
    <template v-for="item in items" :key="item.key">
      <div v-if="item.key === 'settings'" class="flex-1" />
      <router-link
        :to="item.to"
        :data-test-id="`kalo-nav-${item.key}`"
        :aria-current="item.active ? 'page' : undefined"
        class="relative flex flex-col items-center w-[60px] gap-0.5 pt-2 pb-1.5 text-xs font-medium rounded-xl"
        :class="
          item.active
            ? 'bg-n-blue-3 text-n-blue-11'
            : 'text-n-slate-10 hover:bg-n-alpha-2'
        "
      >
        <KaloIcon :name="item.icon" class="size-6" />
        {{ t(item.labelKey) }}
        <span
          v-if="item.badge > 0"
          data-test-id="kalo-badge"
          class="absolute top-1 right-2.5 px-1.5 text-[10px] font-bold leading-4 text-white rounded-full bg-n-blue-9"
        >
          {{ item.badge > 99 ? '99+' : item.badge }}
        </span>
      </router-link>
    </template>
    <KaloRailFooter
      @open-key-shortcut-modal="$emit('openKeyShortcutModal')"
      @show-create-account-modal="$emit('showCreateAccountModal')"
    />
  </nav>
</template>
