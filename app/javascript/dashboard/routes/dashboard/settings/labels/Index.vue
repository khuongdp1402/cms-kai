<script setup>
import { useAlert } from 'dashboard/composables';
import { computed, onBeforeMount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStoreGetters, useStore } from 'dashboard/composables/store';
import { picoSearch } from '@scmmishra/pico-search';

import AddLabel from './AddLabel.vue';
import EditLabel from './EditLabel.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import SettingsLayout from '../SettingsLayout.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloSettingsRow from '../components/KaloSettingsRow.vue';

const getters = useStoreGetters();
const store = useStore();
const { t } = useI18n();

const loading = ref({});
const showAddPopup = ref(false);
const showEditPopup = ref(false);
const showDeleteConfirmationPopup = ref(false);
const selectedLabel = ref({});
const searchQuery = ref('');

const records = computed(() => getters['labels/getLabels'].value);

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return records.value;
  return picoSearch(records.value, query, [
    { name: 'title', weight: 4 },
    'description',
  ]);
});
const uiFlags = computed(() => getters['labels/getUIFlags'].value);

const deleteMessage = computed(() =>
  t('KALO_SETTINGS_UI.PAGES.LABELS.DELETE_MESSAGE', {
    name: selectedLabel.value.title,
  })
);

const openAddPopup = () => {
  showAddPopup.value = true;
};
const hideAddPopup = () => {
  showAddPopup.value = false;
};

const openEditPopup = response => {
  showEditPopup.value = true;
  selectedLabel.value = response;
};
const hideEditPopup = () => {
  showEditPopup.value = false;
};

const openDeletePopup = response => {
  showDeleteConfirmationPopup.value = true;
  selectedLabel.value = response;
};
const closeDeletePopup = () => {
  showDeleteConfirmationPopup.value = false;
};

const deleteLabel = async id => {
  try {
    await store.dispatch('labels/delete', id);
    useAlert(t('KALO_SETTINGS_UI.PAGES.LABELS.DELETED'));
  } catch (error) {
    const errorMessage =
      error?.message || t('KALO_SETTINGS_UI.COMMON.DELETE_ERROR');
    useAlert(errorMessage);
  } finally {
    loading.value[selectedLabel.value.id] = false;
  }
};

const confirmDeletion = () => {
  loading.value[selectedLabel.value.id] = true;
  closeDeletePopup();
  deleteLabel(selectedLabel.value.id);
};

onBeforeMount(() => {
  store.dispatch('labels/get');
});
</script>

<template>
  <SettingsLayout
    :is-loading="uiFlags.isFetching"
    :loading-message="$t('LABEL_MGMT.LOADING')"
    :no-records-found="!records.length"
    :no-records-message="$t('KALO_SETTINGS_UI.PAGES.LABELS.EMPTY')"
    empty-icon="tag"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.PAGES.LABELS.TITLE')"
        :description="$t('KALO_SETTINGS_UI.PAGES.LABELS.DESC')"
        :link-text="$t('LABEL_MGMT.LEARN_MORE')"
        :search-placeholder="$t('KALO_SETTINGS_UI.PAGES.LABELS.SEARCH')"
        feature-name="labels"
      >
        <template v-if="records?.length" #count>
          <span class="text-sm text-n-slate-11">
            {{
              $t('KALO_SETTINGS_UI.PAGES.LABELS.COUNT', { n: records.length })
            }}
          </span>
        </template>
        <template #actions>
          <Button
            :label="$t('KALO_SETTINGS_UI.PAGES.LABELS.ADD')"
            icon="i-lucide-plus"
            size="sm"
            @click="openAddPopup"
          />
        </template>
      </BaseSettingsHeader>
    </template>
    <template #emptyAction>
      <Button
        :label="$t('KALO_SETTINGS_UI.PAGES.LABELS.ADD')"
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
      <ul v-else class="grid gap-2 list-none sm:grid-cols-2">
        <li v-for="label in filteredRecords" :key="label.title">
          <KaloSettingsRow
            :title="label.title"
            :description="label.description"
            class="h-full"
            data-test="label-row"
          >
            <template #leading>
              <span
                class="grid rounded-xl size-10 shrink-0 place-items-center bg-n-alpha-2"
                :title="label.color"
              >
                <span
                  class="border rounded-full size-4 border-n-weak"
                  :style="{ backgroundColor: label.color }"
                />
              </span>
            </template>
            <template #actions>
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                icon="i-woot-edit-pen"
                slate
                ghost
                sm
                :is-loading="loading[label.id]"
                @click="openEditPopup(label)"
              />
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                icon="i-woot-bin"
                slate
                ghost
                sm
                class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                :is-loading="loading[label.id]"
                @click="openDeletePopup(label)"
              />
            </template>
          </KaloSettingsRow>
        </li>
      </ul>
    </template>

    <woot-modal v-model:show="showAddPopup" :on-close="hideAddPopup">
      <AddLabel @close="hideAddPopup" />
    </woot-modal>

    <woot-modal v-model:show="showEditPopup" :on-close="hideEditPopup">
      <EditLabel :selected-response="selectedLabel" @close="hideEditPopup" />
    </woot-modal>

    <woot-delete-modal
      v-model:show="showDeleteConfirmationPopup"
      :on-close="closeDeletePopup"
      :on-confirm="confirmDeletion"
      :title="$t('KALO_SETTINGS_UI.PAGES.LABELS.DELETE_TITLE')"
      :message="deleteMessage"
      message-value=""
      :confirm-text="$t('KALO_SETTINGS_UI.COMMON.DELETE_YES')"
      :reject-text="$t('KALO_SETTINGS_UI.COMMON.KEEP')"
    />
  </SettingsLayout>
</template>
