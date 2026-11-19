<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import LiveChatCampaignsPage from 'dashboard/routes/dashboard/campaigns/pages/LiveChatCampaignsPage.vue';
import BroadcastCampaignsPanel from './BroadcastCampaignsPanel.vue';

// Broadcasts plus the existing Chatwoot campaign lists; shared by the
// Chiến dịch page and the Chiến dịch tab of the former Marketing page.
const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { isRouteNameOn } = useKaloFeatures();

const CAMPAIGN_LINKS = [
  {
    labelKey: 'KALO_MARKETING.CAMPAIGN_LINKS.SMS',
    route: 'campaigns_sms_index',
  },
  {
    labelKey: 'KALO_MARKETING.CAMPAIGN_LINKS.WHATSAPP',
    route: 'campaigns_whatsapp_index',
  },
];

const campaignLinks = computed(() =>
  CAMPAIGN_LINKS.filter(link => isRouteNameOn(link.route))
);
</script>

<template>
  <BroadcastCampaignsPanel />
  <div
    class="overflow-hidden border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
  >
    <div
      class="flex flex-wrap items-center gap-2 px-5 py-3 border-b bg-n-solid-2 border-n-weak"
    >
      <span
        class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-n-solid-1 text-n-slate-12 shadow-sm border border-n-weak"
      >
        {{ t('CAMPAIGN.HEADER') }}
      </span>
      <router-link
        v-for="link in campaignLinks"
        :key="link.route"
        data-test="campaign-link"
        :to="accountScopedRoute(link.route)"
        class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-n-strong bg-n-solid-1 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-solid-3 transition-colors"
      >
        {{ t(link.labelKey) }}
      </router-link>
    </div>
    <div class="p-4 sm:p-5">
      <LiveChatCampaignsPage />
    </div>
  </div>
</template>
