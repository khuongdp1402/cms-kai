<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import MarketingCampaigns from './MarketingCampaigns.vue';

// Chiến dịch as its own page (spec §4). T4 replaces the content with the A–Z
// wizard; until then it shows the existing broadcast and campaign lists.
const { t } = useI18n();
const store = useStore();

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
  store.dispatch('inboxes/get');
});
</script>

<template>
  <KaloPage
    data-test="kalo-campaigns-page"
    :title="t('KALO_CONSOLE_SHOP.PAGES.CAMPAIGNS.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAGES.CAMPAIGNS.DESC')"
  >
    <MarketingCampaigns />
  </KaloPage>
</template>
