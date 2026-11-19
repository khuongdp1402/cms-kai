<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter } from 'dashboard/composables/store';
import { getUserPermissions } from 'dashboard/helper/permissionsHelper';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPageShell from 'dashboard/components-next/layout/KaloPageShell.vue';
import KaloSettingsRow from './components/KaloSettingsRow.vue';

const { t } = useI18n();
const router = useRouter();
const { accountId, accountScopedRoute } = useAccount();
const currentUser = useMapGetter('getCurrentUser');
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

const searchQuery = ref('');

// Six balanced storefront groups rendered as a 3-column Bento grid; reports live in ReportsIndex.
const GROUPS = [
  {
    key: 'CHANNELS',
    links: [
      ['INBOXES', 'msg', 'settings_inbox_list'],
      ['CAMPAIGNS', 'mega', 'campaigns_livechat_index'],
      [
        'HELP_CENTER',
        'search',
        'portals_index',
        { params: { navigationPath: 'portals_articles_index' } },
      ],
    ],
  },
  {
    key: 'TEAM',
    links: [
      ['AGENTS', 'users', 'agent_list'],
      ['TEAMS', 'home', 'settings_teams_list'],
    ],
  },
  {
    key: 'REPLIES',
    links: [
      ['LABELS', 'tag', 'labels_list'],
      ['CANNED', 'send', 'canned_list'],
    ],
  },
  {
    key: 'SHOP',
    links: [
      ['ACCOUNT', 'store', 'general_settings_index'],
      ['PAYMENT', 'qr', 'kalo_payment_settings'],
      ['PLAN', 'wallet', 'kalo_billing'],
    ],
  },
  {
    key: 'ME',
    links: [
      ['PROFILE', 'users', 'profile_settings_index'],
      ['SECURITY', 'check', 'profile_settings_index', { hash: '#security' }],
      [
        'NOTIFICATIONS',
        'bell',
        'profile_settings_index',
        { hash: '#notifications' },
      ],
    ],
  },
  {
    key: 'ADVANCED',
    links: [
      ['ATTRIBUTES', 'card', 'attributes_list'],
      ['AUTOMATION', 'spark', 'automation_list'],
      ['MACROS', 'zap', 'macros_wrapper'],
      ['WORKFLOW', 'check', 'conversation_workflow_index'],
      ['INTEGRATIONS', 'plug', 'settings_applications'],
      ['BOTS', 'msg', 'agent_bots'],
      ['DATA_IMPORT', 'arrow', 'settings_data_imports'],
    ],
  },
];

const routeMeta = (name, params) =>
  router.hasRoute(name)
    ? router.resolve({
        name,
        params: { accountId: accountId.value, ...params },
      }).meta
    : {};

const isVisible = (name, params) => {
  const { permissions, featureFlag } = routeMeta(name, params);
  if (permissions) {
    const userPermissions = getUserPermissions(
      currentUser.value,
      accountId.value
    );
    if (!permissions.some(p => userPermissions.includes(p))) return false;
  }
  return (
    !featureFlag ||
    isFeatureEnabledonAccount.value(accountId.value, featureFlag)
  );
};

const groups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return GROUPS.map(group => ({
    key: group.key,
    links: group.links
      .filter(([, , name, extra = {}]) => isVisible(name, extra.params))
      .map(([key, icon, name, extra = {}]) => ({
        key,
        icon,
        title: t(`KALO_SETTINGS_UI.HUB.LINKS.${key}.TITLE`),
        description: t(`KALO_SETTINGS_UI.HUB.LINKS.${key}.DESC`),
        to: {
          ...accountScopedRoute(name, extra.params),
          ...(extra.hash ? { hash: extra.hash } : {}),
        },
      }))
      .filter(
        item =>
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      ),
  })).filter(group => group.links.length);
});
</script>

<template>
  <KaloPageShell
    :title="t('KALO_SETTINGS_UI.HUB.TITLE')"
    :subtitle="t('KALO_SETTINGS_UI.HUB.SUBTITLE')"
  >
    <template #leading>
      <span
        class="grid rounded-xl size-9 place-items-center bg-n-blue-3 text-n-blue-11 shrink-0"
      >
        <KaloIcon name="set" class="size-5" />
      </span>
    </template>
    <template #actions>
      <div class="relative w-full sm:w-72">
        <KaloIcon
          name="search"
          class="absolute -translate-y-1/2 pointer-events-none size-4 text-n-slate-10 left-3 top-1/2"
        />
        <input
          v-model="searchQuery"
          type="search"
          data-test="settings-search"
          :placeholder="t('KALO_SETTINGS_UI.HUB.SEARCH')"
          :aria-label="t('KALO_SETTINGS_UI.HUB.SEARCH')"
          class="w-full h-9 pl-9 pr-3 mb-0 text-sm border rounded-[10px] outline-none bg-n-solid-1 border-n-strong text-n-slate-12 hover:border-n-slate-6 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15"
        />
      </div>
    </template>

    <p
      v-if="!groups.length"
      data-test="settings-no-match"
      class="py-12 text-sm text-center border rounded-2xl bg-n-solid-1 border-n-weak text-n-slate-10"
    >
      {{ t('KALO_SETTINGS_UI.HUB.NO_MATCH') }}
    </p>
    <div v-else class="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
      <section
        v-for="group in groups"
        :key="group.key"
        :data-test="`hub-group-${group.key}`"
        class="overflow-hidden border shadow-sm rounded-2xl border-n-weak bg-n-solid-1"
      >
        <div class="px-4 py-2.5 border-b bg-n-solid-2 border-n-weak">
          <h2
            class="text-xs font-bold tracking-wider uppercase text-n-slate-10"
          >
            {{ t(`KALO_SETTINGS_UI.HUB.GROUPS.${group.key}`) }}
          </h2>
        </div>
        <ul class="flex flex-col list-none divide-y divide-n-weak bg-n-solid-1">
          <li v-for="item in group.links" :key="`${group.key}-${item.key}`">
            <router-link :to="item.to" class="block">
              <KaloSettingsRow
                :icon="item.icon"
                :title="item.title"
                :description="item.description"
                flat
                clickable
              />
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </KaloPageShell>
</template>
