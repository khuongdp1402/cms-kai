<script setup>
import { computed, onActivated, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { picoSearch } from '@scmmishra/pico-search';
import Avatar from 'next/avatar/Avatar.vue';
import { useAdmin } from 'dashboard/composables/useAdmin';
import SettingsLayout from '../SettingsLayout.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import {
  useMapGetter,
  useStoreGetters,
  useStore,
} from 'dashboard/composables/store';
import ChannelName from './components/ChannelName.vue';
import ChannelIcon from 'next/icon/ChannelIcon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloSettingsRow from '../components/KaloSettingsRow.vue';
import { useRouter } from 'vue-router';

const getters = useStoreGetters();
const store = useStore();
const { t } = useI18n();
const { isAdmin } = useAdmin();
const router = useRouter();

const openInbox = inbox => {
  if (!isAdmin.value) return;
  router.push({ name: 'settings_inbox_show', params: { inboxId: inbox.id } });
};

const showDeletePopup = ref(false);
const selectedInbox = ref({});
const searchQuery = ref('');

const inboxes = useMapGetter('inboxes/getInboxes');

onActivated(() => {
  store.dispatch('inboxes/get');
});

const inboxesList = computed(() => {
  return inboxes.value?.slice().sort((a, b) => a.name.localeCompare(b.name));
});

const filteredInboxesList = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return inboxesList.value;
  return picoSearch(inboxesList.value, query, ['name', 'channel_type']);
});

const uiFlags = computed(() => getters['inboxes/getUIFlags'].value);

const deleteConfirmText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.DELETE_YES')
);

const deleteRejectText = computed(() => t('KALO_SETTINGS_UI.COMMON.KEEP'));

const confirmDeleteMessage = computed(() =>
  t('KALO_SETTINGS_UI.PAGES.INBOXES.DELETE_MESSAGE', {
    name: selectedInbox.value.name,
  })
);
const confirmPlaceHolderText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.TYPE_TO_CONFIRM', {
    name: selectedInbox.value.name,
  })
);

const deleteInbox = async ({ id }) => {
  try {
    await store.dispatch('inboxes/delete', id);
    useAlert(t('KALO_SETTINGS_UI.PAGES.INBOXES.DELETED'));
  } catch (error) {
    useAlert(t('KALO_SETTINGS_UI.COMMON.DELETE_ERROR'));
  }
};
const closeDelete = () => {
  showDeletePopup.value = false;
  selectedInbox.value = {};
};

const confirmDeletion = () => {
  deleteInbox(selectedInbox.value);
  closeDelete();
};
const openDelete = inbox => {
  showDeletePopup.value = true;
  selectedInbox.value = inbox;
};
</script>

<template>
  <SettingsLayout
    :no-records-found="!inboxesList.length"
    :no-records-message="$t('KALO_SETTINGS_UI.PAGES.INBOXES.EMPTY')"
    :is-loading="uiFlags.isFetching"
    empty-icon="msg"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.PAGES.INBOXES.TITLE')"
        :description="$t('KALO_SETTINGS_UI.PAGES.INBOXES.DESC')"
        :link-text="$t('INBOX_MGMT.LEARN_MORE')"
        :search-placeholder="$t('KALO_SETTINGS_UI.PAGES.INBOXES.SEARCH')"
        feature-name="inboxes"
      >
        <template v-if="inboxesList?.length" #count>
          <span class="text-sm text-n-slate-11">
            {{
              $t('KALO_SETTINGS_UI.PAGES.INBOXES.COUNT', {
                n: inboxesList.length,
              })
            }}
          </span>
        </template>
        <template v-if="isAdmin" #actions>
          <router-link :to="{ name: 'settings_inbox_new' }">
            <Button
              :label="$t('KALO_SETTINGS_UI.PAGES.INBOXES.ADD')"
              icon="i-lucide-plus"
              size="sm"
            />
          </router-link>
        </template>
      </BaseSettingsHeader>
    </template>
    <template v-if="isAdmin" #emptyAction>
      <router-link :to="{ name: 'settings_inbox_new' }">
        <Button :label="$t('KALO_SETTINGS_UI.PAGES.INBOXES.ADD_FIRST')" />
      </router-link>
    </template>
    <template #body>
      <span
        v-if="!filteredInboxesList.length && searchQuery"
        class="flex items-center justify-center flex-1 py-16 text-sm text-center text-n-slate-11"
      >
        {{ $t('KALO_SETTINGS_UI.COMMON.NO_RESULTS') }}
      </span>
      <ul v-else class="flex flex-col gap-2 list-none">
        <li v-for="inbox in filteredInboxesList" :key="inbox.id">
          <KaloSettingsRow
            :title="inbox.name"
            :clickable="isAdmin"
            data-test="inbox-row"
            @click="openInbox(inbox)"
          >
            <template #leading>
              <div
                class="grid border shadow-sm bg-n-alpha-3 rounded-xl size-10 shrink-0 border-n-weak place-items-center"
              >
                <Avatar
                  v-if="inbox.avatar_url"
                  :src="inbox.avatar_url"
                  :name="inbox.name"
                  :size="24"
                  rounded-full
                />
                <ChannelIcon
                  v-else
                  class="size-6 text-n-slate-10"
                  :inbox="inbox"
                />
              </div>
            </template>
            <template #description>
              <ChannelName
                :channel-type="inbox.channel_type"
                :medium="inbox.medium"
                :voice-enabled="inbox.voice_enabled"
              />
            </template>
            <template v-if="isAdmin" #actions>
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.SETTINGS')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.SETTINGS')"
                icon="i-woot-settings"
                slate
                ghost
                sm
                @click="openInbox(inbox)"
              />
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                icon="i-woot-bin"
                slate
                ghost
                sm
                class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                @click="openDelete(inbox)"
              />
            </template>
          </KaloSettingsRow>
        </li>
      </ul>
    </template>

    <woot-confirm-delete-modal
      v-if="showDeletePopup"
      v-model:show="showDeletePopup"
      :title="$t('KALO_SETTINGS_UI.PAGES.INBOXES.DELETE_TITLE')"
      :message="confirmDeleteMessage"
      :confirm-text="deleteConfirmText"
      :reject-text="deleteRejectText"
      :confirm-value="selectedInbox.name"
      :confirm-place-holder-text="confirmPlaceHolderText"
      @on-confirm="confirmDeletion"
      @on-close="closeDelete"
    />
  </SettingsLayout>
</template>
