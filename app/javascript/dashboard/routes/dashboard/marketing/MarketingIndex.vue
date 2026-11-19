<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloPageShell from 'dashboard/components-next/layout/KaloPageShell.vue';
import LiveChatCampaignsPage from 'dashboard/routes/dashboard/campaigns/pages/LiveChatCampaignsPage.vue';
import BroadcastCampaignsPanel from './BroadcastCampaignsPanel.vue';
import ContentIdeas from './ContentIdeas.vue';
import ContentCalendar from './ContentCalendar.vue';
import CommentAutomationSettings from './CommentAutomationSettings.vue';
import BrandProfileForm from './BrandProfileForm.vue';

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
  { value: 'calendar', labelKey: 'KALO_MARKETING.TABS.CALENDAR' },
  { value: 'comments', labelKey: 'KALO_MARKETING.TABS.COMMENTS' },
  { value: 'brand', labelKey: 'KALO_MARKETING.TABS.BRAND' },
];

const activeTab = ref('campaigns');

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
  if (store.hasModule?.('inboxes')) {
    store.dispatch('inboxes/get');
  }
});
</script>

<template>
  <KaloPageShell :title="t('KALO_MARKETING.TITLE')">
    <template #headerTabs>
      <div
        role="tablist"
        :aria-label="t('KALO_MARKETING.TABS_LABEL')"
        class="inline-flex flex-wrap gap-1 p-1 border rounded-xl bg-n-solid-2 border-n-weak"
      >
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.value
              ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
              : 'text-n-slate-10 hover:text-n-slate-12'
          "
          @click="activeTab = tab.value"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
    </template>

    <template v-if="activeTab === 'campaigns'">
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
            v-for="link in CAMPAIGN_LINKS"
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
    <ContentIdeas v-else-if="activeTab === 'ideas'" />
    <ContentCalendar v-else-if="activeTab === 'calendar'" />
    <CommentAutomationSettings v-else-if="activeTab === 'comments'" />
    <BrandProfileForm v-else />
  </KaloPageShell>
</template>
