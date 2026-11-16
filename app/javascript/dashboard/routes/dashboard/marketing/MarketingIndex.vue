<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import LiveChatCampaignsPage from 'dashboard/routes/dashboard/campaigns/pages/LiveChatCampaignsPage.vue';
import ContentIdeas from './ContentIdeas.vue';

const { t } = useI18n();
const store = useStore();
const { accountScopedRoute } = useAccount();

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

const TABS = [
  { value: 'campaigns', labelKey: 'KALO_MARKETING.TABS.CAMPAIGNS' },
  { value: 'ideas', labelKey: 'KALO_MARKETING.TABS.IDEAS' },
];

const activeTab = ref('campaigns');

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
});
</script>

<template>
  <section class="flex flex-col flex-1 overflow-auto bg-n-surface-1">
    <div class="p-6 pb-0">
      <h1 class="text-xl font-extrabold text-n-slate-12">
        {{ t('KALO_MARKETING.TITLE') }}
      </h1>
      <div
        role="tablist"
        :aria-label="t('KALO_MARKETING.TABS_LABEL')"
        class="inline-flex gap-1 p-1 mt-4 rounded-xl bg-n-alpha-2"
      >
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          class="px-3 py-1.5 text-sm font-semibold rounded-lg"
          :class="
            activeTab === tab.value
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-11'
          "
          @click="activeTab = tab.value"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
    </div>
    <template v-if="activeTab === 'campaigns'">
      <div class="flex gap-4 px-6 pt-3 text-sm">
        <router-link
          v-for="link in CAMPAIGN_LINKS"
          :key="link.route"
          data-test="campaign-link"
          :to="accountScopedRoute(link.route)"
          class="font-semibold text-n-slate-11 hover:text-n-slate-12"
        >
          {{ t(link.labelKey) }}
        </router-link>
      </div>
      <LiveChatCampaignsPage />
    </template>
    <div v-else class="p-6">
      <ContentIdeas />
    </div>
  </section>
</template>
