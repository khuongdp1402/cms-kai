<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAlert, useTrack } from 'dashboard/composables';
import { useAccount } from 'dashboard/composables/useAccount';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { CAMPAIGN_TYPES } from 'shared/constants/campaign.js';
import { CAMPAIGNS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events.js';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import CampaignList from 'dashboard/components-next/Campaigns/Pages/CampaignPage/CampaignList.vue';
import LiveChatCampaignForm from 'dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignForm.vue';
import ConfirmDeleteCampaignDialog from 'dashboard/components-next/Campaigns/Pages/CampaignPage/ConfirmDeleteCampaignDialog.vue';

// Website greetings (Chatwoot live chat campaigns) as one section of the
// Chiến dịch page (guided UX spec §2, §3.3): a secondary button, never a
// second "Tạo chiến dịch"; the empty state is one sentence and one action, no
// sample cards; create and edit open in KaloDrawer, delete keeps the center
// confirmation dialog.
const { t } = useI18n();
const store = useStore();
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

const uiFlags = computed(() => store.getters['campaigns/getUIFlags'] || {});
const campaigns = computed(
  () => store.getters['campaigns/getLiveChatCampaigns'] || []
);
const isFetching = computed(() => Boolean(uiFlags.value.isFetching));
const isEmpty = computed(() => !isFetching.value && !campaigns.value.length);

// null | 'create' | campaign being edited
const drawer = ref(null);
const deleteDialogRef = ref(null);
const selectedCampaign = ref(null);

const isEditing = computed(
  () => drawer.value !== null && drawer.value !== 'create'
);

const openCreate = () => {
  drawer.value = 'create';
};
const openEdit = campaign => {
  drawer.value = campaign;
};
const closeDrawer = () => {
  drawer.value = null;
};
const openDelete = campaign => {
  selectedCampaign.value = campaign;
  deleteDialogRef.value?.dialogRef.open();
};

const createCampaign = async details => {
  try {
    await store.dispatch('campaigns/create', details);
    useTrack(CAMPAIGNS_EVENTS.CREATE_CAMPAIGN, {
      type: CAMPAIGN_TYPES.ONGOING,
    });
    useAlert(t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.SUCCESS_MESSAGE'));
    closeDrawer();
  } catch (error) {
    useAlert(
      error?.response?.message ||
        t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.ERROR_MESSAGE')
    );
  }
};

const updateCampaign = async details => {
  try {
    await store.dispatch('campaigns/update', {
      id: drawer.value.id,
      ...details,
    });
    useAlert(t('CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.SUCCESS_MESSAGE'));
    closeDrawer();
  } catch (error) {
    useAlert(
      error?.response?.message ||
        t('CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.ERROR_MESSAGE')
    );
  }
};

const onSubmit = details =>
  isEditing.value ? updateCampaign(details) : createCampaign(details);
</script>

<template>
  <KaloCard
    data-test="website-campaigns"
    data-tour="campaign-website"
    flush
    :title="t('KALO_SHELL2.CAMPAIGNS.WEBSITE.TITLE')"
    :description="t('KALO_SHELL2.CAMPAIGNS.WEBSITE.DESC')"
  >
    <template #actions>
      <router-link
        v-for="link in campaignLinks"
        :key="link.route"
        data-test="campaign-link"
        :to="accountScopedRoute(link.route)"
        class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-n-strong bg-n-solid-1 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-solid-3"
      >
        {{ t(link.labelKey) }}
      </router-link>
      <button
        v-if="!isEmpty && !isFetching"
        type="button"
        data-test="website-campaign-add"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold border rounded-lg border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3"
        @click="openCreate"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_SHELL2.CAMPAIGNS.WEBSITE.ADD') }}
      </button>
    </template>

    <div
      v-if="isFetching"
      class="flex items-center justify-center py-10 text-n-slate-11"
    >
      <Spinner />
    </div>
    <div
      v-else-if="isEmpty"
      data-test="website-campaigns-empty"
      class="flex flex-col items-center gap-3 px-5 py-8 text-center"
    >
      <p class="max-w-md mb-0 text-sm text-n-slate-11">
        {{ t('KALO_SHELL2.CAMPAIGNS.WEBSITE.EMPTY') }}
      </p>
      <button
        type="button"
        data-test="website-campaign-add"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3"
        @click="openCreate"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_SHELL2.CAMPAIGNS.WEBSITE.ADD') }}
      </button>
    </div>
    <div v-else class="p-4 sm:p-5">
      <CampaignList
        :campaigns="campaigns"
        is-live-chat-type
        @edit="openEdit"
        @delete="openDelete"
      />
    </div>

    <KaloDrawer
      v-if="drawer"
      data-test="website-campaign-drawer"
      :title="
        isEditing
          ? t('CAMPAIGN.LIVE_CHAT.EDIT.TITLE')
          : t('CAMPAIGN.LIVE_CHAT.CREATE.TITLE')
      "
      @close="closeDrawer"
    >
      <LiveChatCampaignForm
        :key="isEditing ? drawer.id : 'create'"
        :mode="isEditing ? 'edit' : 'create'"
        :selected-campaign="isEditing ? drawer : null"
        @submit="onSubmit"
        @cancel="closeDrawer"
      />
    </KaloDrawer>
    <ConfirmDeleteCampaignDialog
      ref="deleteDialogRef"
      :selected-campaign="selectedCampaign"
    />
  </KaloCard>
</template>
