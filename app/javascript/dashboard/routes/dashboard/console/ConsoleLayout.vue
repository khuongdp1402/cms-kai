<script setup>
import { useI18n } from 'vue-i18n';
import Auth from 'dashboard/api/auth';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const { t } = useI18n();

const ITEMS = [
  { name: 'kalo_console_overview', icon: 'home', label: 'OVERVIEW' },
  { name: 'kalo_console_shops', icon: 'store', label: 'SHOPS' },
  { name: 'kalo_console_payments', icon: 'wallet', label: 'PAYMENTS' },
];
</script>

<template>
  <div
    class="flex flex-col w-full h-screen md:flex-row bg-console-bg text-console-ink"
  >
    <aside
      class="flex flex-row flex-wrap items-center w-full gap-1 px-3.5 py-3 md:flex-col md:items-stretch md:w-56 md:py-5 shrink-0 bg-console-sidebar text-console-text"
    >
      <div class="flex items-center gap-2 px-2.5 mr-auto md:mr-0 md:pb-5">
        <b class="text-lg text-white">{{ t('KALO_CONSOLE.BRAND_NAME') }}</b>
        <span
          class="px-2 py-0.5 text-xs font-bold text-white rounded-md bg-console-soft"
        >
          {{ t('KALO_CONSOLE.BRAND') }}
        </span>
      </div>
      <RouterLink
        v-for="item in ITEMS"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl md:text-base hover:bg-console-accent/60"
        active-class="!bg-console-accent text-white"
      >
        <KaloIcon :name="item.icon" class="size-5" />
        {{ t(`KALO_CONSOLE.NAV.${item.label}`) }}
      </RouterLink>
      <div class="hidden flex-1 md:block" />
      <a
        data-testid="back-to-app"
        href="/app/"
        class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl md:text-base hover:bg-console-accent/60"
      >
        {{ t('KALO_CONSOLE.NAV.BACK_TO_APP') }}
      </a>
      <button
        data-testid="console-logout"
        class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-left rounded-xl md:text-base hover:bg-console-accent/60"
        @click="Auth.logout()"
      >
        {{ t('KALO_CONSOLE.NAV.LOGOUT') }}
      </button>
    </aside>
    <main class="flex-1 min-w-0 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
