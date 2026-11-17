<script setup>
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import SettingsLayout from '../SettingsLayout.vue';
import { computed, ref } from 'vue';
import { picoSearch } from '@scmmishra/pico-search';
import { useMapGetter } from 'dashboard/composables/store.js';
import { useStoreGetters, useStore } from 'dashboard/composables/store';
import { useI18n } from 'vue-i18n';

import Icon from 'dashboard/components-next/icon/Icon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon.vue';
import KaloSettingsRow from '../components/KaloSettingsRow.vue';
import { useRouter } from 'vue-router';

const store = useStore();
const { t } = useI18n();
const getters = useStoreGetters();
const { isAdmin } = useAdmin();
const router = useRouter();

const openTeam = team => {
  if (!isAdmin.value) return;
  router.push({ name: 'settings_teams_edit', params: { teamId: team.id } });
};

const loading = ref({});
const searchQuery = ref('');

const teamsList = useMapGetter('teams/getTeams');

const filteredTeamsList = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return teamsList.value;
  return picoSearch(teamsList.value, query, ['name', 'description']);
});

const uiFlags = computed(() => getters['teams/getUIFlags'].value);

const deleteTeam = async ({ id }) => {
  try {
    loading.value[id] = true;
    await store.dispatch('teams/delete', id);
    useAlert(t('KALO_SETTINGS_UI.PAGES.TEAMS.DELETED'));
  } catch (error) {
    useAlert(t('KALO_SETTINGS_UI.COMMON.DELETE_ERROR'));
  } finally {
    loading.value[id] = false;
  }
};

const showDeletePopup = ref(false);
const selectedTeam = ref({});

const openDelete = team => {
  showDeletePopup.value = true;
  selectedTeam.value = team;
};

const closeDelete = () => {
  showDeletePopup.value = false;
  selectedTeam.value = {};
};

const confirmDeletion = () => {
  deleteTeam(selectedTeam.value);
  closeDelete();
};

const deleteConfirmText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.DELETE_YES')
);

const deleteRejectText = computed(() => t('KALO_SETTINGS_UI.COMMON.KEEP'));

const confirmDeleteTitle = computed(() =>
  t('KALO_SETTINGS_UI.PAGES.TEAMS.DELETE_TITLE', {
    name: selectedTeam.value.name,
  })
);

const confirmPlaceHolderText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.TYPE_TO_CONFIRM', {
    name: selectedTeam.value.name,
  })
);
</script>

<template>
  <SettingsLayout
    :is-loading="uiFlags.isFetching"
    :loading-message="$t('TEAMS_SETTINGS.LOADING')"
    :no-records-found="!teamsList.length"
    :no-records-message="$t('KALO_SETTINGS_UI.PAGES.TEAMS.EMPTY')"
    empty-icon="home"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.PAGES.TEAMS.TITLE')"
        :description="$t('KALO_SETTINGS_UI.PAGES.TEAMS.DESC')"
        :link-text="$t('TEAMS_SETTINGS.LEARN_MORE')"
        :search-placeholder="$t('KALO_SETTINGS_UI.PAGES.TEAMS.SEARCH')"
        feature-name="team_management"
      >
        <template v-if="teamsList?.length" #count>
          <span class="text-sm text-n-slate-11">
            {{
              $t('KALO_SETTINGS_UI.PAGES.TEAMS.COUNT', { n: teamsList.length })
            }}
          </span>
        </template>
        <template v-if="isAdmin" #actions>
          <router-link :to="{ name: 'settings_teams_new' }">
            <Button
              :label="$t('KALO_SETTINGS_UI.PAGES.TEAMS.ADD')"
              icon="i-lucide-plus"
              size="sm"
            />
          </router-link>
        </template>
      </BaseSettingsHeader>
    </template>
    <template v-if="isAdmin" #emptyAction>
      <router-link :to="{ name: 'settings_teams_new' }">
        <Button :label="$t('KALO_SETTINGS_UI.PAGES.TEAMS.ADD')" />
      </router-link>
    </template>
    <template #body>
      <span
        v-if="!filteredTeamsList.length && searchQuery"
        class="flex items-center justify-center flex-1 py-16 text-sm text-center text-n-slate-11"
      >
        {{ $t('KALO_SETTINGS_UI.COMMON.NO_RESULTS') }}
      </span>

      <ul v-else class="flex flex-col gap-2 list-none">
        <li v-for="team in filteredTeamsList" :key="team.id">
          <KaloSettingsRow
            :title="team.name"
            :description="team.description"
            :clickable="isAdmin"
            data-test="team-row"
            @click="openTeam(team)"
          >
            <template #leading>
              <span
                class="grid text-lg border rounded-xl size-10 shrink-0 place-items-center border-n-weak"
              >
                <EmojiIcon
                  v-if="team.icon"
                  :value="team.icon"
                  :color="team.icon_color"
                  class="size-5"
                />
                <Icon
                  v-else
                  icon="i-lucide-users-round"
                  class="size-4 text-n-slate-11"
                />
              </span>
            </template>
            <template v-if="isAdmin" #actions>
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                icon="i-woot-settings"
                slate
                ghost
                sm
                @click="openTeam(team)"
              />
              <Button
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                icon="i-woot-bin"
                slate
                ghost
                sm
                class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                :is-loading="loading[team.id]"
                @click="openDelete(team)"
              />
            </template>
          </KaloSettingsRow>
        </li>
      </ul>
    </template>
    <woot-confirm-delete-modal
      v-if="showDeletePopup"
      v-model:show="showDeletePopup"
      :title="confirmDeleteTitle"
      :message="$t('KALO_SETTINGS_UI.PAGES.TEAMS.DELETE_MESSAGE')"
      :confirm-text="deleteConfirmText"
      :reject-text="deleteRejectText"
      :confirm-value="selectedTeam.name"
      :confirm-place-holder-text="confirmPlaceHolderText"
      @on-confirm="confirmDeletion"
      @on-close="closeDelete"
    />
  </SettingsLayout>
</template>
