<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloFeatureOff from '../KaloFeatureOff.vue';
import MarketingCampaigns from './MarketingCampaigns.vue';
import ContentIdeas from './ContentIdeas.vue';
import ContentCalendar from './ContentCalendar.vue';
import CommentAutomationSettings from './CommentAutomationSettings.vue';
import BrandProfileForm from './BrandProfileForm.vue';

// Former all-in-one Marketing page, kept for bookmarks. The sidebar now opens
// Bình luận, Chiến dịch and Thương hiệu as their own pages (spec §4).
const { t } = useI18n();
const store = useStore();
const { isOn, isLoaded } = useKaloFeatures();

const TABS = [
  {
    value: 'campaigns',
    labelKey: 'KALO_MARKETING.TABS.CAMPAIGNS',
    feature: FEATURE_FLAGS.KALO_CAMPAIGNS,
  },
  {
    value: 'ideas',
    labelKey: 'KALO_MARKETING.TABS.IDEAS',
    feature: FEATURE_FLAGS.KALO_BRAND,
  },
  {
    value: 'calendar',
    labelKey: 'KALO_MARKETING.TABS.CALENDAR',
    feature: FEATURE_FLAGS.KALO_BRAND,
  },
  {
    value: 'comments',
    labelKey: 'KALO_MARKETING.TABS.COMMENTS',
    feature: FEATURE_FLAGS.KALO_COMMENTS,
  },
  {
    value: 'brand',
    labelKey: 'KALO_MARKETING.TABS.BRAND',
    feature: FEATURE_FLAGS.KALO_BRAND,
  },
];

const tabs = computed(() => TABS.filter(tab => isOn(tab.feature)));
const activeTab = ref('campaigns');

watch(
  tabs,
  visible => {
    if (visible.length && !visible.some(tab => tab.value === activeTab.value))
      activeTab.value = visible[0].value;
  },
  { immediate: true }
);

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
  if (store.hasModule?.('inboxes')) {
    store.dispatch('inboxes/get');
  }
});
</script>

<template>
  <KaloFeatureOff v-if="isLoaded && !tabs.length" />
  <KaloPage v-else-if="isLoaded" :title="t('KALO_MARKETING.TITLE')">
    <template #tabs>
      <div
        role="tablist"
        :aria-label="t('KALO_MARKETING.TABS_LABEL')"
        class="inline-flex flex-wrap gap-1 p-1 border rounded-xl bg-n-solid-2 border-n-weak"
      >
        <button
          v-for="tab in tabs"
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

    <MarketingCampaigns v-if="activeTab === 'campaigns'" />
    <ContentIdeas v-else-if="activeTab === 'ideas'" />
    <ContentCalendar v-else-if="activeTab === 'calendar'" />
    <CommentAutomationSettings v-else-if="activeTab === 'comments'" />
    <BrandProfileForm v-else />
  </KaloPage>
</template>
