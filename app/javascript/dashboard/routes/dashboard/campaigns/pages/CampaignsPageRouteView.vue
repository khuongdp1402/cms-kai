<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  keepAlive: { type: Boolean, default: true },
});

const store = useStore();
const route = useRoute();
const { t } = useI18n();
const { accountScopedRoute } = useAccount();

const CHANNEL_LINKS = [
  {
    name: 'campaigns_livechat_index',
    labelKey: 'KALO_MARKETING.CAMPAIGN_LINKS.LIVECHAT',
  },
  {
    name: 'campaigns_sms_index',
    labelKey: 'KALO_MARKETING.CAMPAIGN_LINKS.SMS',
  },
  {
    name: 'campaigns_whatsapp_index',
    labelKey: 'KALO_MARKETING.CAMPAIGN_LINKS.WHATSAPP',
  },
];

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
});
</script>

<template>
  <div
    class="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-surface-1"
  >
    <nav
      class="flex flex-wrap items-center gap-3 px-6 pt-4 pb-2 border-b border-n-weak bg-n-surface-1"
    >
      <router-link
        :to="accountScopedRoute('kalo_marketing')"
        data-test="campaigns-back-marketing"
        class="inline-flex items-center gap-1 text-sm font-medium text-n-slate-11 hover:text-n-slate-12"
      >
        <KaloIcon name="back" class="size-4 rtl:rotate-180" />
        {{ t('KALO_MARKETING.CAMPAIGN_LINKS.BACK') }}
      </router-link>
      <div class="flex flex-wrap items-center gap-1.5 ltr:ml-auto rtl:mr-auto">
        <router-link
          v-for="item in CHANNEL_LINKS"
          :key="item.name"
          :to="accountScopedRoute(item.name)"
          class="px-3 py-1 text-xs font-semibold rounded-full"
          :class="
            route.name === item.name
              ? 'bg-n-blue-3 text-n-blue-11'
              : 'text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12'
          "
        >
          {{ t(item.labelKey) }}
        </router-link>
      </div>
    </nav>
    <div class="flex flex-col flex-1 min-h-0">
      <router-view v-slot="{ Component }">
        <keep-alive v-if="keepAlive">
          <component :is="Component" />
        </keep-alive>
        <component :is="Component" v-else />
      </router-view>
    </div>
  </div>
</template>
