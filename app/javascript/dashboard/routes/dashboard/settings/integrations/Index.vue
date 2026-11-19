<script setup>
import { useStoreGetters, useStore } from 'dashboard/composables/store';
import { computed, onMounted, ref } from 'vue';
import { picoSearch } from '@scmmishra/pico-search';
import IntegrationItem from './IntegrationItem.vue';
import SettingsLayout from '../SettingsLayout.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { ADVANCED_INTEGRATION_IDS } from 'dashboard/helper/kaloFeatures';

const store = useStore();
const getters = useStoreGetters();

const searchQuery = ref('');
const uiFlags = getters['integrations/getUIFlags'];

const { isOn } = useKaloFeatures();

// Webhook and dashboard apps need kalo_advanced_automation (spec §4).
const integrationList = computed(() => {
  const list = getters['integrations/getAppIntegrations'].value;
  return isOn(FEATURE_FLAGS.KALO_ADVANCED_AUTOMATION)
    ? list
    : list.filter(item => !ADVANCED_INTEGRATION_IDS.includes(item.id));
});

const filteredIntegrationList = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return integrationList.value;
  return picoSearch(integrationList.value, query, ['name', 'description']);
});

onMounted(() => {
  store.dispatch('integrations/get');
});
</script>

<template>
  <SettingsLayout
    :is-loading="uiFlags.isFetching"
    :loading-message="$t('INTEGRATION_SETTINGS.LOADING')"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.HUB.LINKS.INTEGRATIONS.TITLE')"
        :description="$t('KALO_SETTINGS_UI.HUB.LINKS.INTEGRATIONS.DESC')"
        :link-text="$t('INTEGRATION_SETTINGS.LEARN_MORE')"
        :search-placeholder="$t('INTEGRATION_SETTINGS.SEARCH_PLACEHOLDER')"
        feature-name="integrations"
      />
    </template>
    <template #body>
      <div class="flex-grow flex-shrink overflow-auto">
        <span
          v-if="!filteredIntegrationList.length && searchQuery"
          class="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11"
        >
          {{ $t('INTEGRATION_SETTINGS.NO_RESULTS') }}
        </span>
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <IntegrationItem
            v-for="item in filteredIntegrationList"
            :id="item.id"
            :key="item.id"
            :logo="item.logo"
            :name="item.name"
            :description="item.description"
            :enabled="item.enabled"
          />
        </div>
      </div>
    </template>
  </SettingsLayout>
</template>
