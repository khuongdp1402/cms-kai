<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import BrandProfileForm from './BrandProfileForm.vue';
import ContentCalendar from './ContentCalendar.vue';
import ContentIdeas from './ContentIdeas.vue';

// Thương hiệu (spec §4): brand profile, content calendar and AI ideas.
const { t } = useI18n();

const TABS = [
  { value: 'profile', labelKey: 'KALO_CONSOLE_SHOP.PAGES.BRAND.TABS.PROFILE' },
  {
    value: 'calendar',
    labelKey: 'KALO_CONSOLE_SHOP.PAGES.BRAND.TABS.CALENDAR',
  },
  { value: 'ideas', labelKey: 'KALO_CONSOLE_SHOP.PAGES.BRAND.TABS.IDEAS' },
];

const activeTab = ref('profile');
</script>

<template>
  <KaloPage
    data-test="kalo-brand-page"
    :title="t('KALO_CONSOLE_SHOP.PAGES.BRAND.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAGES.BRAND.DESC')"
  >
    <template #tabs>
      <div
        data-tour="brand-tabs"
        role="tablist"
        :aria-label="t('KALO_CONSOLE_SHOP.PAGES.BRAND.TABS_LABEL')"
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

    <div data-tour="brand-content" class="flex flex-col min-w-0 gap-4">
      <BrandProfileForm v-if="activeTab === 'profile'" />
      <ContentCalendar v-else-if="activeTab === 'calendar'" />
      <ContentIdeas v-else />
    </div>
  </KaloPage>
</template>
