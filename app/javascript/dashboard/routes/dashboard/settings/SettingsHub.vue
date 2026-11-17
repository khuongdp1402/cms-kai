<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter } from 'dashboard/composables/store';
import { getUserPermissions } from 'dashboard/helper/permissionsHelper';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloSettingsRow from './components/KaloSettingsRow.vue';

const { t } = useI18n();
const router = useRouter();
const { accountId, accountScopedRoute } = useAccount();
const currentUser = useMapGetter('getCurrentUser');
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

// Each link: [i18n key under KALO_SETTINGS_UI.HUB.LINKS, icon, route name, extra].
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
  {
    key: 'REPORTS',
    links: [
      ['REPORT_OVERVIEW', 'chart', 'account_overview_reports'],
      ['REPORT_CONVERSATIONS', 'msg', 'conversation_reports'],
      ['REPORT_AGENTS', 'users', 'agent_reports_index'],
      ['REPORT_LABELS', 'tag', 'label_reports_index'],
      ['REPORT_INBOXES', 'msg', 'inbox_reports_index'],
      ['REPORT_TEAMS', 'home', 'team_reports_index'],
      ['REPORT_CSAT', 'check', 'csat_reports'],
    ],
  },
];

// Resolved meta includes the parent routes' meta, as the router guard sees it.
// Names the router does not know (partial routers in specs) carry no limits.
const routeMeta = (name, params) =>
  router.hasRoute(name)
    ? router.resolve({
        name,
        params: { accountId: accountId.value, ...params },
      }).meta
    : {};

// Same rules the router and the old Chatwoot sidebar applied: role permissions
// and the account feature flag of the target page.
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

const groups = computed(() =>
  GROUPS.map(group => ({
    key: group.key,
    links: group.links
      .filter(([, , name, extra = {}]) => isVisible(name, extra.params))
      .map(([key, icon, name, extra = {}]) => ({
        key,
        icon,
        to: {
          ...accountScopedRoute(name, extra.params),
          ...(extra.hash ? { hash: extra.hash } : {}),
        },
      })),
  })).filter(group => group.links.length)
);
</script>

<template>
  <section class="flex-1 overflow-auto bg-n-surface-1">
    <div class="w-full max-w-5xl px-4 py-6 mx-auto sm:px-6">
      <header class="flex items-center gap-3 mb-6">
        <span
          class="grid rounded-xl size-10 place-items-center bg-n-blue-3 text-n-blue-11"
        >
          <KaloIcon name="set" class="size-5" />
        </span>
        <div class="min-w-0">
          <h1 class="text-xl font-extrabold text-n-slate-12">
            {{ t('KALO_SETTINGS_UI.HUB.TITLE') }}
          </h1>
          <p class="text-sm text-n-slate-11">
            {{ t('KALO_SETTINGS_UI.HUB.SUBTITLE') }}
          </p>
        </div>
      </header>
      <div class="grid gap-6 md:grid-cols-2">
        <section
          v-for="group in groups"
          :key="group.key"
          :data-test="`hub-group-${group.key}`"
        >
          <h2
            class="px-1 mb-2 text-xs font-bold tracking-wide uppercase text-n-slate-11"
          >
            {{ t(`KALO_SETTINGS_UI.HUB.GROUPS.${group.key}`) }}
          </h2>
          <ul
            class="flex flex-col overflow-hidden list-none border divide-y rounded-2xl border-n-weak divide-n-weak bg-n-solid-1"
          >
            <li v-for="item in group.links" :key="`${group.key}-${item.key}`">
              <router-link :to="item.to" class="block">
                <KaloSettingsRow
                  :icon="item.icon"
                  :title="t(`KALO_SETTINGS_UI.HUB.LINKS.${item.key}.TITLE`)"
                  :description="
                    t(`KALO_SETTINGS_UI.HUB.LINKS.${item.key}.DESC`)
                  "
                  flat
                  clickable
                />
              </router-link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
