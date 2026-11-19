<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Auth from 'dashboard/api/auth';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const { t } = useI18n();

const ITEMS = [
  { name: 'kalo_console_overview', icon: 'home', label: 'OVERVIEW' },
  { name: 'kalo_console_shops', icon: 'store', label: 'SHOPS' },
  { name: 'kalo_console_payments', icon: 'wallet', label: 'PAYMENTS' },
  { name: 'kalo_console_emails', icon: 'send', label: 'EMAILS' },
];

const collapsed = ref(false);
</script>

<template>
  <div
    class="flex flex-col w-full min-h-screen md:h-screen md:flex-row bg-console-bg text-console-ink"
  >
    <aside
      data-testid="console-sidebar"
      :data-collapsed="collapsed ? 'true' : 'false'"
      class="flex flex-row flex-wrap items-center w-full gap-1.5 px-3 py-3 transition-[width] duration-200 md:flex-col md:items-stretch md:py-5 shrink-0 bg-console-sidebar text-console-text"
      :class="collapsed ? 'md:w-[72px]' : 'md:w-60'"
    >
      <div
        class="flex items-center gap-2.5 px-1.5 mr-auto md:mr-0 md:pb-4 md:mb-1 md:border-b md:border-white/10"
        :class="collapsed ? 'md:flex-col md:gap-2' : ''"
      >
        <span
          aria-hidden="true"
          class="flex items-center justify-center text-sm font-extrabold text-white rounded-lg size-8 shrink-0 bg-n-brand"
        >
          {{ t('KALO_CONSOLE.BRAND_MARK') }}
        </span>
        <div v-show="!collapsed" class="flex items-center min-w-0 gap-2">
          <b class="text-lg leading-none text-white">
            {{ t('KALO_CONSOLE.BRAND_NAME') }}
          </b>
          <span
            class="px-2 py-0.5 text-[11px] font-bold text-white rounded-md bg-console-soft"
          >
            {{ t('KALO_CONSOLE.BRAND') }}
          </span>
        </div>
        <button
          type="button"
          data-testid="console-sidebar-toggle"
          class="items-center justify-center hidden rounded-lg md:flex size-7 shrink-0 text-console-text/80 hover:bg-console-accent/60 hover:text-white"
          :class="collapsed ? '' : 'ml-auto'"
          :aria-label="t('KALO_CONSOLE.NAV.TOGGLE')"
          :title="t('KALO_CONSOLE.NAV.TOGGLE')"
          @click="collapsed = !collapsed"
        >
          <KaloIcon
            name="chevron"
            class="transition-transform size-4"
            :class="collapsed ? '-rotate-90' : 'rotate-90'"
          />
        </button>
      </div>

      <RouterLink
        v-for="item in ITEMS"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl hover:bg-console-accent/60"
        :class="collapsed ? 'md:justify-center' : ''"
        :title="t(`KALO_CONSOLE.NAV.${item.label}`)"
        active-class="!bg-console-accent text-white"
      >
        <KaloIcon :name="item.icon" class="size-5 shrink-0" />
        <span v-show="!collapsed" class="truncate">
          {{ t(`KALO_CONSOLE.NAV.${item.label}`) }}
        </span>
      </RouterLink>

      <div class="hidden flex-1 md:block" />

      <div class="flex items-center gap-1.5 md:flex-col md:items-stretch md:pt-3 md:border-t md:border-white/10">
        <a
          data-testid="open-super-admin"
          href="/super_admin"
          class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl hover:bg-console-accent/60"
          :class="collapsed ? 'md:justify-center' : ''"
          :title="t('KALO_CONSOLE.NAV.SUPER_ADMIN')"
        >
          <KaloIcon name="set" class="size-5 shrink-0" />
          <span v-show="!collapsed" class="truncate">
            {{ t('KALO_CONSOLE.NAV.SUPER_ADMIN') }}
          </span>
        </a>
        <a
          data-testid="back-to-app"
          href="/app/"
          class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl hover:bg-console-accent/60"
          :class="collapsed ? 'md:justify-center' : ''"
          :title="t('KALO_CONSOLE.NAV.BACK_TO_APP')"
        >
          <KaloIcon name="back" class="size-5 shrink-0" />
          <span v-show="!collapsed" class="truncate">
            {{ t('KALO_CONSOLE.NAV.BACK_TO_APP') }}
          </span>
        </a>
        <button
          type="button"
          data-testid="console-logout"
          class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-left rounded-xl hover:bg-console-accent/60"
          :class="collapsed ? 'md:justify-center' : ''"
          :title="t('KALO_CONSOLE.NAV.LOGOUT')"
          @click="Auth.logout()"
        >
          <KaloIcon name="lock" class="size-5 shrink-0" />
          <span v-show="!collapsed" class="truncate">
            {{ t('KALO_CONSOLE.NAV.LOGOUT') }}
          </span>
        </button>
      </div>
    </aside>

    <main class="flex-1 min-w-0 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
