<script setup>
import { useAlert } from 'dashboard/composables';
import { computed, onMounted, ref } from 'vue';
import Avatar from 'next/avatar/Avatar.vue';
import { useI18n } from 'vue-i18n';
import { picoSearch } from '@scmmishra/pico-search';
import {
  useStoreGetters,
  useStore,
  useMapGetter,
} from 'dashboard/composables/store';

import AddAgent from './AddAgent.vue';
import EditAgent from './EditAgent.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import SettingsLayout from '../SettingsLayout.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloSettingsRow from '../components/KaloSettingsRow.vue';

const getters = useStoreGetters();
const store = useStore();
const { t } = useI18n();

const loading = ref({});
const showAddPopup = ref(false);
const showDeletePopup = ref(false);
const showEditPopup = ref(false);
const agentAPI = ref({ message: '' });
const currentAgent = ref({});
const searchQuery = ref('');

const deleteConfirmText = computed(() =>
  t('KALO_SETTINGS_UI.COMMON.DELETE_YES')
);
const deleteRejectText = computed(() => t('KALO_SETTINGS_UI.COMMON.KEEP'));
const deleteMessage = computed(() =>
  t('KALO_SETTINGS_UI.PAGES.AGENTS.DELETE_MESSAGE', {
    name: currentAgent.value.name,
  })
);

const agentList = computed(() => getters['agents/getAgents'].value);

const filteredAgentList = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return agentList.value;
  return picoSearch(agentList.value, query, ['name', 'email']);
});

const uiFlags = computed(() => getters['agents/getUIFlags'].value);
const currentUserId = computed(() => getters.getCurrentUserID.value);
const customRoles = useMapGetter('customRole/getCustomRoles');

onMounted(() => {
  store.dispatch('agents/get');
  store.dispatch('customRole/getCustomRole');
});

const findCustomRole = agent =>
  customRoles.value.find(role => role.id === agent.custom_role_id);

const getAgentRoleName = agent => {
  if (!agent.custom_role_id) {
    return t(`AGENT_MGMT.AGENT_TYPES.${agent.role.toUpperCase()}`);
  }
  const customRole = findCustomRole(agent);
  return customRole ? customRole.name : '';
};

const getAgentRolePermissions = agent => {
  if (!agent.custom_role_id) {
    return [];
  }
  const customRole = findCustomRole(agent);
  return customRole?.permissions || [];
};

const verifiedAdministrators = computed(() => {
  return agentList.value.filter(
    agent => agent.role === 'administrator' && agent.confirmed
  );
});

const showEditAction = agent => {
  return currentUserId.value !== agent.id;
};

const showDeleteAction = agent => {
  if (currentUserId.value === agent.id) {
    return false;
  }

  if (!agent.confirmed) {
    return true;
  }

  if (agent.role === 'administrator') {
    return verifiedAdministrators.value.length !== 1;
  }
  return true;
};

const showAlertMessage = message => {
  loading.value[currentAgent.value.id] = false;
  currentAgent.value = {};
  agentAPI.value.message = message;
  useAlert(message);
};

const openAddPopup = () => {
  showAddPopup.value = true;
};
const hideAddPopup = () => {
  showAddPopup.value = false;
};

const openEditPopup = agent => {
  showEditPopup.value = true;
  currentAgent.value = agent;
};
const hideEditPopup = () => {
  showEditPopup.value = false;
};

const openDeletePopup = agent => {
  showDeletePopup.value = true;
  currentAgent.value = agent;
};
const closeDeletePopup = () => {
  showDeletePopup.value = false;
};

const deleteAgent = async id => {
  try {
    await store.dispatch('agents/delete', id);
    showAlertMessage(t('KALO_SETTINGS_UI.PAGES.AGENTS.DELETED'));
  } catch (error) {
    showAlertMessage(t('KALO_SETTINGS_UI.COMMON.DELETE_ERROR'));
  }
};
const confirmDeletion = () => {
  loading.value[currentAgent.value.id] = true;
  closeDeletePopup();
  deleteAgent(currentAgent.value.id);
};
</script>

<template>
  <SettingsLayout
    :is-loading="uiFlags.isFetching"
    :loading-message="$t('AGENT_MGMT.LOADING')"
    :no-records-found="!agentList.length"
    :no-records-message="$t('KALO_SETTINGS_UI.PAGES.AGENTS.EMPTY')"
    empty-icon="users"
  >
    <template #header>
      <BaseSettingsHeader
        v-model:search-query="searchQuery"
        :title="$t('KALO_SETTINGS_UI.PAGES.AGENTS.TITLE')"
        :description="$t('KALO_SETTINGS_UI.PAGES.AGENTS.DESC')"
        :link-text="$t('AGENT_MGMT.LEARN_MORE')"
        :search-placeholder="$t('KALO_SETTINGS_UI.PAGES.AGENTS.SEARCH')"
        feature-name="agents"
      >
        <template v-if="agentList?.length" #count>
          <span class="text-sm text-n-slate-11">
            {{
              $t('KALO_SETTINGS_UI.PAGES.AGENTS.COUNT', { n: agentList.length })
            }}
          </span>
        </template>
        <template #actions>
          <Button
            :label="$t('KALO_SETTINGS_UI.PAGES.AGENTS.ADD')"
            icon="i-lucide-plus"
            size="sm"
            @click="openAddPopup"
          />
        </template>
      </BaseSettingsHeader>
    </template>
    <template #emptyAction>
      <Button
        :label="$t('KALO_SETTINGS_UI.PAGES.AGENTS.ADD')"
        @click="openAddPopup"
      />
    </template>
    <template #body>
      <span
        v-if="!filteredAgentList.length && searchQuery"
        class="flex items-center justify-center flex-1 py-16 text-sm text-center text-n-slate-11"
      >
        {{ $t('KALO_SETTINGS_UI.COMMON.NO_RESULTS') }}
      </span>
      <ul v-else class="flex flex-col gap-2 list-none">
        <li v-for="(agent, index) in filteredAgentList" :key="agent.email">
          <KaloSettingsRow :title="agent.name" data-test="agent-row">
            <template #leading>
              <Avatar
                :src="agent.thumbnail"
                :name="agent.name"
                :status="agent.availability_status"
                :size="40"
                hide-offline-status
              />
            </template>
            <template #badge>
              <span
                class="relative px-2 py-0.5 text-xs font-medium rounded-full shrink-0 bg-n-alpha-2 text-n-slate-11"
                :class="{
                  'hover:text-n-slate-12 group cursor-pointer':
                    agent.custom_role_id,
                }"
              >
                {{ getAgentRoleName(agent) }}
                <div
                  class="absolute ltr:left-0 rtl:right-0 z-10 hidden w-[300px] bg-n-alpha-3 backdrop-blur-[100px] rounded-xl outline outline-1 outline-n-container shadow-lg top-8"
                  :class="{ 'group-hover:block': agent.custom_role_id }"
                >
                  <div class="flex flex-col gap-1 p-4">
                    <span class="text-heading-3 text-n-slate-12">
                      {{ $t('AGENT_MGMT.LIST.AVAILABLE_CUSTOM_ROLE') }}
                    </span>
                    <ul class="mb-0 list-disc ltr:pl-4 rtl:pr-4">
                      <li
                        v-for="permission in getAgentRolePermissions(agent)"
                        :key="permission"
                        class="text-body-main text-n-slate-11"
                      >
                        {{
                          $t(
                            `CUSTOM_ROLE.PERMISSIONS.${permission.toUpperCase()}`
                          )
                        }}
                      </li>
                    </ul>
                  </div>
                </div>
              </span>
            </template>
            <template #description>
              <span>{{ agent.email }}</span>
              <span
                v-if="!agent.confirmed"
                class="text-n-amber-11 ms-2"
                data-test="agent-pending"
              >
                {{ $t('KALO_SETTINGS_UI.PAGES.AGENTS.PENDING') }}
              </span>
            </template>
            <template
              v-if="showEditAction(agent) || showDeleteAction(agent)"
              #actions
            >
              <Button
                v-if="showEditAction(agent)"
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.EDIT')"
                icon="i-woot-edit-pen"
                slate
                ghost
                sm
                @click="openEditPopup(agent)"
              />
              <Button
                v-if="showDeleteAction(agent)"
                v-tooltip.top="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                :aria-label="$t('KALO_SETTINGS_UI.COMMON.DELETE')"
                icon="i-woot-bin"
                slate
                ghost
                sm
                class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                :is-loading="loading[agent.id]"
                @click="openDeletePopup(agent, index)"
              />
            </template>
          </KaloSettingsRow>
        </li>
      </ul>
    </template>

    <woot-modal v-model:show="showAddPopup" :on-close="hideAddPopup">
      <AddAgent @close="hideAddPopup" />
    </woot-modal>

    <woot-modal v-model:show="showEditPopup" :on-close="hideEditPopup">
      <EditAgent
        v-if="showEditPopup"
        :id="currentAgent.id"
        :name="currentAgent.name"
        :provider="currentAgent.provider"
        :type="currentAgent.role"
        :email="currentAgent.email"
        :availability="currentAgent.availability_status"
        :custom-role-id="currentAgent.custom_role_id"
        @close="hideEditPopup"
      />
    </woot-modal>

    <woot-delete-modal
      v-model:show="showDeletePopup"
      :on-close="closeDeletePopup"
      :on-confirm="confirmDeletion"
      :title="$t('KALO_SETTINGS_UI.PAGES.AGENTS.DELETE_TITLE')"
      :message="deleteMessage"
      message-value=""
      :confirm-text="deleteConfirmText"
      :reject-text="deleteRejectText"
    />
  </SettingsLayout>
</template>
