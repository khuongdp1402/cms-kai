<script setup>
import { onMounted, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useRoute, useRouter } from 'vue-router';

import ContactsDetailsLayout from 'dashboard/components-next/Contacts/ContactsDetailsLayout.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import ContactDetails from 'dashboard/components-next/Contacts/Pages/ContactDetails.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import ContactNotes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactNotes.vue';
import ContactHistory from 'dashboard/components-next/Contacts/ContactsSidebar/ContactHistory.vue';
import ContactMedia from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMedia.vue';
import ContactMerge from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMerge.vue';
import ContactCustomAttributes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();

const contact = useMapGetter('contacts/getContactById');
const uiFlags = useMapGetter('contacts/getUIFlags');

const activeTab = ref('attributes');
const contactMergeRef = ref(null);

const isFetchingItem = computed(() => uiFlags.value.isFetchingItem);
const isMergingContact = computed(() => uiFlags.value.isMerging);
const isUpdatingContact = computed(() => uiFlags.value.isUpdating);

const selectedContact = computed(() => contact.value(route.params.contactId));

const showSpinner = computed(
  () => isFetchingItem.value || isMergingContact.value
);

const { t } = useI18n();

// Kalo: five equal icon + label tabs fit the 440px column and the 400px
// drawer without horizontal scrolling (guided UX spec §2).
const CONTACT_TABS_OPTIONS = [
  { key: 'ATTRIBUTES', value: 'attributes', icon: 'card' },
  { key: 'HISTORY', value: 'history', icon: 'msg' },
  { key: 'NOTES', value: 'notes', icon: 'pen' },
  { key: 'MEDIA', value: 'media', icon: 'img' },
  { key: 'MERGE', value: 'merge', icon: 'users' },
];

const tabs = computed(() => {
  return CONTACT_TABS_OPTIONS.map(tab => ({
    label: t(`CONTACTS_LAYOUT.SIDEBAR.TABS.${tab.key}`),
    value: tab.value,
    icon: tab.icon,
  }));
});

const goToContactsList = () => {
  if (window.history.state?.back || window.history.length > 1) {
    router.back();
  } else {
    router.push(`/app/accounts/${route.params.accountId}/contacts?page=1`);
  }
};

const fetchActiveContact = async () => {
  if (route.params.contactId) {
    await store.dispatch('contacts/show', { id: route.params.contactId });
    await store.dispatch(
      'contacts/fetchContactableInbox',
      route.params.contactId
    );
  }
};

const handleTabChange = tab => {
  activeTab.value = tab.value;
};

const TAB_PANEL_ID = 'contact-tabpanel';
const tabsRef = ref(null);

// Roving focus for the tablist (WAI-ARIA tabs): ←/→ move and select,
// Home/End jump to the first/last tab.
const onTabKeydown = event => {
  const current = CONTACT_TABS_OPTIONS.findIndex(
    tab => tab.value === activeTab.value
  );
  const last = CONTACT_TABS_OPTIONS.length - 1;
  const next = {
    ArrowRight: current === last ? 0 : current + 1,
    ArrowLeft: current === 0 ? last : current - 1,
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  handleTabChange(CONTACT_TABS_OPTIONS[next]);
  tabsRef.value?.querySelectorAll('[role="tab"]')[next]?.focus();
};

const fetchContactNotes = () => {
  const { contactId } = route.params;
  if (contactId) store.dispatch('contactNotes/get', { contactId });
};

const fetchContactConversations = () => {
  const { contactId } = route.params;
  if (contactId) store.dispatch('contactConversations/get', contactId);
};

const fetchAttributes = () => {
  store.dispatch('attributes/get');
};

const toggleContactBlock = async isBlocked => {
  const ALERT_MESSAGES = {
    success: {
      block: t('CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_SUCCESS_MESSAGE'),
      unblock: t('CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_SUCCESS_MESSAGE'),
    },
    error: {
      block: t('CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_ERROR_MESSAGE'),
      unblock: t('CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_ERROR_MESSAGE'),
    },
  };

  try {
    await store.dispatch(`contacts/update`, {
      ...selectedContact.value,
      blocked: !isBlocked,
    });
    useAlert(
      isBlocked ? ALERT_MESSAGES.success.unblock : ALERT_MESSAGES.success.block
    );
  } catch (error) {
    useAlert(
      isBlocked ? ALERT_MESSAGES.error.unblock : ALERT_MESSAGES.error.block
    );
  }
};

onMounted(() => {
  fetchActiveContact();
  fetchContactNotes();
  fetchContactConversations();
  fetchAttributes();
});
</script>

<template>
  <div
    class="flex flex-col justify-between flex-1 h-full m-0 overflow-hidden bg-n-background"
  >
    <ContactsDetailsLayout
      :button-label="$t('CONTACTS_LAYOUT.HEADER.SEND_MESSAGE')"
      :selected-contact="selectedContact"
      is-detail-view
      :show-pagination-footer="false"
      :is-updating="isUpdatingContact"
      @go-to-contacts-list="goToContactsList"
      @toggle-block="toggleContactBlock"
    >
      <div
        v-if="showSpinner"
        class="flex items-center justify-center py-10 text-n-slate-11"
      >
        <Spinner />
      </div>
      <ContactDetails
        v-else-if="selectedContact"
        :selected-contact="selectedContact"
        @go-to-contacts-list="goToContactsList"
      />
      <template #sidebarHeader>
        <div class="px-3 py-3 border-b sm:px-5 bg-n-solid-2 border-n-weak">
          <div
            ref="tabsRef"
            role="tablist"
            data-test-id="contact-tabs"
            class="grid grid-cols-5 gap-1 p-1 rounded-xl bg-n-alpha-1 dark:bg-n-solid-1"
          >
            <button
              v-for="tab in tabs"
              :id="`contact-tab-${tab.value}`"
              :key="tab.value"
              type="button"
              role="tab"
              :data-test-id="`contact-tab-${tab.value}`"
              :aria-selected="activeTab === tab.value"
              :aria-controls="TAB_PANEL_ID"
              :tabindex="activeTab === tab.value ? 0 : -1"
              class="flex flex-col items-center min-w-0 gap-0.5 px-1 py-1.5 text-[11px] font-semibold leading-tight rounded-lg"
              :class="
                activeTab === tab.value
                  ? 'bg-n-solid-1 dark:bg-n-solid-3 text-n-slate-12 shadow-sm'
                  : 'text-n-slate-11 hover:text-n-slate-12'
              "
              @click="handleTabChange(tab)"
              @keydown="onTabKeydown"
            >
              <KaloIcon :name="tab.icon" class="size-4 shrink-0" />
              <span class="w-full text-center truncate">{{ tab.label }}</span>
            </button>
          </div>
        </div>
      </template>
      <template #sidebar>
        <div
          v-if="isFetchingItem"
          class="flex items-center justify-center py-10 text-n-slate-11"
        >
          <Spinner />
        </div>
        <div
          v-else
          :id="TAB_PANEL_ID"
          role="tabpanel"
          class="contents"
          :aria-labelledby="`contact-tab-${activeTab}`"
        >
          <ContactCustomAttributes
            v-if="activeTab === 'attributes'"
            :selected-contact="selectedContact"
          />
          <ContactNotes v-if="activeTab === 'notes'" />
          <ContactHistory v-if="activeTab === 'history'" />
          <ContactMedia v-if="activeTab === 'media'" />
          <ContactMerge
            v-if="activeTab === 'merge'"
            ref="contactMergeRef"
            :selected-contact="selectedContact"
            @go-to-contacts-list="goToContactsList"
            @reset-tab="handleTabChange(CONTACT_TABS_OPTIONS[0])"
          />
        </div>
      </template>
    </ContactsDetailsLayout>
  </div>
</template>
