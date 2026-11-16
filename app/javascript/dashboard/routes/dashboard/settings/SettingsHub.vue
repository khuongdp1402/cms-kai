<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();

const link = (labelKey, routeName, params) => ({
  labelKey: `KALO_NAV.HUB.LINKS.${labelKey}`,
  to: accountScopedRoute(routeName, params),
});

const groups = computed(() => [
  {
    key: 'SELLING',
    links: [
      link('CAMPAIGNS', 'campaigns_livechat_index'),
      link('HELP_CENTER', 'portals_index', {
        navigationPath: 'portals_articles_index',
      }),
    ],
  },
  {
    key: 'REPORTS',
    links: [
      link('REPORT_OVERVIEW', 'account_overview_reports'),
      link('REPORT_CONVERSATIONS', 'conversation_reports'),
      link('REPORT_AGENTS', 'agent_reports_index'),
      link('REPORT_LABELS', 'label_reports_index'),
      link('REPORT_INBOXES', 'inbox_reports_index'),
      link('REPORT_TEAMS', 'team_reports_index'),
      link('REPORT_CSAT', 'csat_reports'),
    ],
  },
  {
    key: 'CHANNELS',
    links: [
      link('INBOXES', 'settings_inbox_list'),
      link('INTEGRATIONS', 'settings_applications'),
      link('LABELS', 'labels_list'),
    ],
  },
  {
    key: 'TEAM',
    links: [link('AGENTS', 'agent_list'), link('TEAMS', 'settings_teams_list')],
  },
  {
    key: 'AUTOMATION',
    links: [
      link('CANNED', 'canned_list'),
      link('AUTOMATION', 'automation_list'),
      link('MACROS', 'macros_wrapper'),
      link('ATTRIBUTES', 'attributes_list'),
    ],
  },
  {
    key: 'ACCOUNT',
    links: [
      link('PROFILE', 'profile_settings_index'),
      link('ACCOUNT', 'general_settings_index'),
      link('BILLING', 'billing_settings_index'),
    ],
  },
]);
</script>

<template>
  <section class="flex-1 p-6 overflow-auto">
    <h1 class="text-xl font-extrabold text-n-slate-12">
      {{ t('KALO_NAV.HUB.TITLE') }}
    </h1>
    <div class="grid gap-6 mt-6 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="group in groups" :key="group.key">
        <h2 class="mb-2 text-sm font-semibold text-n-slate-10">
          {{ t(`KALO_NAV.HUB.GROUPS.${group.key}`) }}
        </h2>
        <ul class="flex flex-col">
          <li v-for="item in group.links" :key="item.labelKey">
            <router-link
              :to="item.to"
              class="block px-3 py-2 text-sm font-medium rounded-lg text-n-slate-12 hover:bg-n-alpha-2"
            >
              {{ t(item.labelKey) }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
