<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import Avatar from 'next/avatar/Avatar.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import ConsoleInviteDrawer from './ConsoleInviteDrawer.vue';
import ConsoleAddToInboxDrawer from './ConsoleAddToInboxDrawer.vue';
import {
  chipClass,
  linkClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './consoleStyles';

const { t } = useI18n();
const store = useStore();
const { accountScopedRoute } = useAccount();
const agents = useMapGetter('agents/getAgents');
const teams = useMapGetter('teams/getTeams');

// ?invite=1 (setup checklist "Mời nhân viên") opens the invite drawer.
const route = useRoute();
const isInviteOpen = ref(route?.query?.invite === '1');
const inboxAgent = ref(null);

onMounted(() => {
  store.dispatch('agents/get');
  store.dispatch('teams/get');
  store.dispatch('inboxes/get');
});

const roleKey = agent =>
  agent.role === 'administrator' ? 'ADMINISTRATOR' : 'AGENT';

const onInvited = agent => {
  isInviteOpen.value = false;
  // Next step of the invite: choose the channels the new agent answers.
  if (agent) inboxAgent.value = agent;
};
</script>

<template>
  <KaloCard
    data-test="console-team"
    :title="t('KALO_CONSOLE_SHOP.TEAM.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.TEAM.DESC')"
    flush
  >
    <template #actions>
      <button
        type="button"
        data-test="console-invite"
        :class="primaryButtonClass"
        class="!h-8 !px-3 !text-xs"
        @click="isInviteOpen = true"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_CONSOLE_SHOP.TEAM.INVITE') }}
      </button>
    </template>

    <div class="grid lg:grid-cols-[2fr_1fr] lg:divide-x divide-n-weak">
      <section class="min-w-0">
        <h3
          class="px-5 pt-4 pb-1 mb-0 text-xs font-bold tracking-wide uppercase text-n-slate-10"
        >
          {{ t('KALO_CONSOLE_SHOP.TEAM.AGENTS') }}
        </h3>
        <p v-if="!agents.length" class="px-5 py-3 mb-0 text-sm text-n-slate-11">
          {{ t('KALO_CONSOLE_SHOP.TEAM.NO_AGENTS') }}
        </p>
        <ul v-else class="flex flex-col list-none divide-y divide-n-weak">
          <li
            v-for="agent in agents"
            :key="agent.id"
            data-test="console-agent"
            class="flex flex-wrap items-center gap-3 px-5 py-3"
          >
            <Avatar
              :name="agent.name"
              :src="agent.thumbnail"
              :size="32"
              rounded-full
            />
            <div class="flex-1 min-w-0">
              <p class="mb-0 text-sm font-semibold truncate text-n-slate-12">
                {{ agent.name }}
              </p>
              <p class="mb-0 text-xs truncate text-n-slate-11">
                {{ agent.email }}
              </p>
            </div>
            <span class="bg-n-alpha-2 text-n-slate-12" :class="[chipClass]">
              {{ t(`KALO_CONSOLE_SHOP.TEAM.ROLES.${roleKey(agent)}`) }}
            </span>
            <span
              v-if="agent.confirmed === false"
              class="bg-n-amber-3 text-n-amber-11"
              :class="[chipClass]"
            >
              {{ t('KALO_CONSOLE_SHOP.TEAM.PENDING') }}
            </span>
            <button
              type="button"
              :data-test="`console-agent-inboxes-${agent.id}`"
              :class="secondaryButtonClass"
              @click="inboxAgent = agent"
            >
              <KaloIcon name="msg" class="size-4" />
              {{ t('KALO_CONSOLE_SHOP.TEAM.ADD_TO_INBOX') }}
            </button>
          </li>
        </ul>
        <div
          v-if="agents.length === 1"
          data-test="console-team-empty"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-t border-n-weak"
        >
          <p class="mb-0 text-sm text-n-slate-11">
            {{ t('KALO_GUIDE.EMPTY.TEAM_SOLO') }}
          </p>
          <button
            type="button"
            data-test="console-team-empty-invite"
            :class="secondaryButtonClass"
            @click="isInviteOpen = true"
          >
            <KaloIcon name="plus" class="size-4" />
            {{ t('KALO_CONSOLE_SHOP.TEAM.INVITE') }}
          </button>
        </div>
      </section>
      <section class="min-w-0 border-t lg:border-t-0 border-n-weak">
        <h3
          class="px-5 pt-4 pb-1 mb-0 text-xs font-bold tracking-wide uppercase text-n-slate-10"
        >
          {{ t('KALO_CONSOLE_SHOP.TEAM.TEAMS') }}
        </h3>
        <div
          v-if="!teams.length"
          data-test="console-teams-empty"
          class="flex flex-col items-start gap-2 px-5 py-3"
        >
          <p class="mb-0 text-sm text-n-slate-11">
            {{ t('KALO_CONSOLE_SHOP.TEAM.NO_TEAMS') }}
          </p>
          <router-link
            :to="accountScopedRoute('settings_teams_list')"
            data-test="console-teams-empty-create"
            :class="secondaryButtonClass"
          >
            {{ t('KALO_GUIDE.EMPTY.TEAMS_ACTION') }}
          </router-link>
        </div>
        <ul v-else class="flex flex-col px-5 py-2 list-none">
          <li
            v-for="team in teams"
            :key="team.id"
            data-test="console-team-item"
            class="flex items-center gap-2 py-1.5 text-sm text-n-slate-12"
          >
            <KaloIcon name="users" class="size-4 text-n-slate-10 shrink-0" />
            <span class="truncate">{{ team.name }}</span>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        <router-link :to="accountScopedRoute('agent_list')" :class="linkClass">
          {{ t('KALO_CONSOLE_SHOP.TEAM.MANAGE_AGENTS') }}
        </router-link>
        <router-link
          :to="accountScopedRoute('settings_teams_list')"
          :class="linkClass"
        >
          {{ t('KALO_CONSOLE_SHOP.TEAM.MANAGE_TEAMS') }}
        </router-link>
      </div>
    </template>

    <ConsoleInviteDrawer
      v-if="isInviteOpen"
      @close="isInviteOpen = false"
      @invited="onInvited"
    />
    <ConsoleAddToInboxDrawer
      v-if="inboxAgent"
      :agent="inboxAgent"
      @close="inboxAgent = null"
      @added="inboxAgent = null"
    />
  </KaloCard>
</template>
