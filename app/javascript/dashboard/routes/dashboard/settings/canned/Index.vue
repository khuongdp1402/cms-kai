<script setup>
import { useAlert } from 'dashboard/composables';
import AddCanned from './AddCanned.vue';
import EditCanned from './EditCanned.vue';
import SettingsLayout from '../SettingsLayout.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStoreGetters, useStore } from 'dashboard/composables/store';
import { picoSearch } from '@scmmishra/pico-search';
import { useMessageFormatter } from 'shared/composables/useMessageFormatter';

import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import KaloSettingsRow from '../components/KaloSettingsRow.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineOptions({
  name: 'CannedResponseSettings',
});

const getters = useStoreGetters();
const store = useStore();
const { t } = useI18n();

const { getPlainText } = useMessageFormatter();

const showAddPopup = ref(false);
const loading = ref({});
const showEditPopup = ref(false);
const showDeleteConfirmationPopup = ref(false);
const activeResponse = ref({});
const cannedResponseAPI = ref({ message: '' });

const sortOrder = ref('asc');
const searchQuery = ref('');

const records = computed(() =>
  getters.getSortedCannedResponses.value(sortOrder.value)
);

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return records.value;
  return picoSearch(records.value, query, [
    { name: 'short_code', weight: 4 },
    'content',
  ]);
});
const uiFlags = computed(() => getters.getUIFlags.value);

const deleteConfirmText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.DELETE_YES')
);

const deleteRejectText = computed(() => t('KALO_SETTINGS_UI.COMMON.KEEP'));

const deleteMessage = computed(() =>
  t('KALO_SETTINGS_UI.PAGES.CANNED.DELETE_MESSAGE', {
    name: activeResponse.value.short_code,
  })
);

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
};

const fetchCannedResponses = async () => {
  try {
    await store.dispatch('getCannedResponse');
  } catch (error) {
    // Ignore Error
  }
};

onMounted(() => {
  fetchCannedResponses();
});

const showAlertMessage = message => {
  loading[activeResponse.value.id] = false;
  activeResponse.value = {};
  cannedResponseAPI.value.message = message;
  useAlert(message);
};

const openAddPopup = () => {
  showAddPopup.value = true;
};
const hideAddPopup = () => {
  showAddPopup.value = false;
};

const openEditPopup = response => {
  showEditPopup.value = true;
  activeResponse.value = response;
};
const hideEditPopup = () => {
  showEditPopup.value = false;
};

const openDeletePopup = response => {
  showDeleteConfirmationPopup.value = true;
  activeResponse.value = response;
};

const closeDeletePopup = () => {
  showDeleteConfirmationPopup.value = false;
};

const deleteCannedResponse = async id => {
  try {
    await store.dispatch('deleteCannedResponse', id);
    showAlertMessage(t('KALO_SETTINGS_UI.PAGES.CANNED.DELETED'));
  } catch (error) {
    const errorMessage =
      error?.message || t('KALO_SETTINGS_UI.COMMON.DELETE_ERROR');
    showAlertMessage(errorMessage);
  }
};

const confirmDeletion = () => {
  loading[activeResponse.value.id] = true;
  closeDeletePopup();
  deleteCannedResponse(activeResponse.value.id);
};
</script>

<template>
  <SettingsLayout
    :is-loading="uiFlags.fetchingList"
    :loading-message="$t('CANNED_MGMT.LOADING')"
    :no-records-found="!records.length"
    :no-records-message="$t('KALO_SETTINGS_UI.PAGES.CANNED.EMPTY')"
    empty-icon="send"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.PAGES.CANNED.TITLE')"
        :description="$t('KALO_SETTINGS_UI.PAGES.CANNED.DESC')"
        :link-text="$t('CANNED_MGMT.LEARN_MORE')"
        :search-placeholder="$t('KALO_SETTINGS_UI.PAGES.CANNED.SEARCH')"
        feature-name="canned_responses"
      >
        <template v-if="records?.length" #count>
          <button
            type="button"
            data-test="canned-sort"
            class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-lg text-n-slate-11 hover:bg-n-alpha-2"
            @click="toggleSort"
          >
            <Icon
              class="size-4 shrink-0"
              :icon="
                sortOrder === 'desc'
                  ? 'i-woot-sort-descending'
                  : 'i-woot-sort-ascending'
              "
            />
            {{
              sortOrder === 'desc'
                ? $t('KALO_SETTINGS_UI.PAGES.CANNED.SORT_DESC')
                : $t('KALO_SETTINGS_UI.PAGES.CANNED.SORT_ASC')
            }}
          </button>
          <span class="text-sm text-n-slate-11">
            {{
              $t('KALO_SETTINGS_UI.PAGES.CANNED.COUNT', { n: records.length })
            }}
          </span>
        </template>
        <template #actions>
          <Button
            :label="$t('KALO_SETTINGS_UI.PAGES.CANNED.ADD')"
            icon="i-lucide-plus"
            size="sm"
            @click="openAddPopup"
          />
        </template>
      </BaseSettingsHeader>
    </template>
    <template #emptyAction>
      <Button
        :label="$t('KALO_SETTINGS_UI.PAGES.CANNED.ADD')"
        @click="openAddPopup"
      />
    </template>

    <template #body>
      <span
        v-if="!filteredRecords.length && searchQuery"
        class="flex items-center justify-center flex-1 py-16 text-sm text-center text-n-slate-11"
      >
        {{ $t('KALO_SETTINGS_UI.COMMON.NO_RESULTS') }}
      </span>
      <ul v-else class="flex flex-col gap-2 list-none">
        <li v-for="cannedItem in filteredRecords" :key="cannedItem.short_code">
          <KaloSettingsRow data-test="canned-row">
            <template #leading>
              <span
                class="grid rounded-xl size-10 shrink-0 place-items-center bg-n-blue-3 text-n-blue-11"
              >
                <KaloIcon name="send" class="size-5" />
              </span>
            </template>
            <template #title>{{ cannedItem.short_code }}</template>
            <template #description>
              <p class="mb-0 whitespace-normal line-clamp-2">
                {{ getPlainText(cannedItem.content) }}
              </p>
            </template>
            <template #actions>
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                icon="i-woot-edit-pen"
                slate
                ghost
                sm
                @click="openEditPopup(cannedItem)"
              />
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                icon="i-woot-bin"
                slate
                ghost
                sm
                class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                :is-loading="loading[cannedItem.id]"
                @click="openDeletePopup(cannedItem)"
              />
            </template>
          </KaloSettingsRow>
        </li>
      </ul>
    </template>
    <woot-modal v-model:show="showAddPopup" :on-close="hideAddPopup">
      <AddCanned :on-close="hideAddPopup" />
    </woot-modal>

    <woot-modal v-model:show="showEditPopup" :on-close="hideEditPopup">
      <EditCanned
        v-if="showEditPopup"
        :id="activeResponse.id"
        :edshort-code="activeResponse.short_code"
        :edcontent="activeResponse.content"
        :on-close="hideEditPopup"
      />
    </woot-modal>

    <woot-delete-modal
      v-model:show="showDeleteConfirmationPopup"
      :on-close="closeDeletePopup"
      :on-confirm="confirmDeletion"
      :title="$t('KALO_SETTINGS_UI.PAGES.CANNED.DELETE_TITLE')"
      :message="deleteMessage"
      message-value=""
      :confirm-text="deleteConfirmText"
      :reject-text="deleteRejectText"
    />
  </SettingsLayout>
</template>
