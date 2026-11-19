<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useAlert } from 'dashboard/composables';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import MarketingCampaigns from './MarketingCampaigns.vue';
import CampaignList from './campaignFlow/CampaignList.vue';
import CampaignWizard from './campaignFlow/CampaignWizard.vue';
import CampaignResults from './campaignFlow/CampaignResults.vue';

// Chiến dịch page (guided UX spec §5): broadcast campaigns with the A–Z
// wizard, then the existing website (live chat) campaign list.
const { t } = useI18n();
const store = useStore();
const { isAdmin } = useAdmin();

const broadcasts = ref([]);
const loadError = ref(false);
const wizardOpen = ref(false);
const editingDraft = ref(null);
const resultsId = ref(null);

const loadBroadcasts = async () => {
  try {
    const { data } = await broadcastsAPI.list();
    broadcasts.value = Array.isArray(data?.broadcasts) ? data.broadcasts : [];
    loadError.value = false;
  } catch {
    loadError.value = true;
  }
};

const openCreate = () => {
  editingDraft.value = null;
  wizardOpen.value = true;
};

const openItem = item => {
  if (item.status === 'draft' && isAdmin.value) {
    editingDraft.value = item;
    wizardOpen.value = true;
    return;
  }
  resultsId.value = item.id;
};

const onSaved = record => {
  const rest = broadcasts.value.filter(item => item.id !== record.id);
  broadcasts.value = [record, ...rest];
};

const onResultsLoaded = record => {
  broadcasts.value = broadcasts.value.map(item =>
    item.id === record.id ? record : item
  );
};

const closeWizard = () => {
  wizardOpen.value = false;
  editingDraft.value = null;
  loadBroadcasts();
};

const deleteDraft = async item => {
  try {
    await broadcastsAPI.destroyDraft(item.id);
    broadcasts.value = broadcasts.value.filter(row => row.id !== item.id);
  } catch {
    useAlert(t('KALO_CAMPAIGN_FLOW.ERRORS.SAVE_FAILED'));
  }
};

onMounted(() => {
  store.dispatch('campaigns/get');
  store.dispatch('labels/get');
  store.dispatch('inboxes/get');
  loadBroadcasts();
});
</script>

<template>
  <KaloPage
    data-test="kalo-campaigns-page"
    :title="t('KALO_CONSOLE_SHOP.PAGES.CAMPAIGNS.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAGES.CAMPAIGNS.DESC')"
  >
    <template #actions>
      <button
        v-if="isAdmin"
        type="button"
        data-test="campaign-create"
        data-tour="campaign-create"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
        @click="openCreate"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_CAMPAIGN_FLOW.CREATE') }}
      </button>
    </template>

    <KaloCard
      flush
      :title="t('KALO_CAMPAIGN_FLOW.LIST.TITLE')"
      :description="t('KALO_CAMPAIGN_FLOW.LIST.DESC')"
    >
      <p
        v-if="!isAdmin"
        class="px-4 pt-3 text-xs sm:px-5 text-n-slate-11"
        data-test="campaign-readonly"
      >
        {{ t('KALO_CAMPAIGN_FLOW.READONLY') }}
      </p>
      <p
        v-if="loadError"
        data-test="campaign-load-error"
        class="px-4 py-3 text-sm font-medium sm:px-5 text-n-ruby-11"
      >
        {{ t('KALO_CAMPAIGN_FLOW.LIST.LOAD_ERROR') }}
      </p>
      <CampaignList
        v-else
        :broadcasts="broadcasts"
        :is-admin="isAdmin"
        @open="openItem"
        @delete="deleteDraft"
        @create="openCreate"
      />
    </KaloCard>

    <MarketingCampaigns :show-broadcasts="false" />

    <CampaignWizard
      v-if="wizardOpen"
      :draft="editingDraft"
      :existing-campaigns="broadcasts"
      @saved="onSaved"
      @close="closeWizard"
    />

    <KaloDrawer
      v-if="resultsId"
      data-test="campaign-results-drawer"
      width-class="sm:max-w-[600px]"
      :title="t('KALO_CAMPAIGN_FLOW.RESULTS.TITLE')"
      @close="resultsId = null"
    >
      <CampaignResults :broadcast-id="resultsId" @loaded="onResultsLoaded" />
    </KaloDrawer>
  </KaloPage>
</template>
