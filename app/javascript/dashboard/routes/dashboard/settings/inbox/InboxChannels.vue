<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import { useBranding } from 'shared/composables/useBranding';

import PageHeader from '../SettingsSubPageHeader.vue';

const { t } = useI18n();
const route = useRoute();
const { replaceInstallationName } = useBranding();

const globalConfig = useMapGetter('globalConfig/get');

const createFlowSteps = computed(() => {
  const steps = ['CHANNEL', 'INBOX', 'AGENT', 'FINISH'];

  const routes = {
    CHANNEL: 'settings_inbox_new',
    INBOX: 'settings_inboxes_page_channel',
    AGENT: 'settings_inboxes_add_agents',
    FINISH: 'settings_inbox_finish',
  };

  return steps.map(step => {
    return {
      title: t(`INBOX_MGMT.CREATE_FLOW.${step}.TITLE`),
      body: t(`INBOX_MGMT.CREATE_FLOW.${step}.BODY`),
      route: routes[step],
    };
  });
});

const currentStep = computed(
  () =>
    createFlowSteps.value.findIndex(step => step.route === route.name) + 1 || 1
);

const isFirstStep = computed(() => {
  return route.name === 'settings_inbox_new';
});

const isFinishStep = computed(() => {
  return route.name === 'settings_inbox_finish';
});

const pageTitle = computed(() => {
  if (isFirstStep.value) {
    return t('INBOX_MGMT.ADD.AUTH.TITLE');
  }
  if (isFinishStep.value) {
    return t('INBOX_MGMT.ADD.AUTH.TITLE_FINISH');
  }
  return t('INBOX_MGMT.ADD.AUTH.TITLE_NEXT');
});

const items = computed(() => {
  return createFlowSteps.value.map(item => ({
    ...item,
    body: replaceInstallationName(item.body),
  }));
});
</script>

<template>
  <div class="flex flex-col w-full gap-4 mx-auto mb-8 max-w-7xl sm:px-2">
    <div class="flex flex-col gap-1 lg:hidden">
      <span
        data-test="inbox-wizard-step"
        class="text-xs font-semibold text-n-blue-11"
      >
        {{
          t('KALO_SETTINGS_UI.PAGES.INBOXES.WIZARD_STEP', {
            step: currentStep,
            total: createFlowSteps.length,
          })
        }}
      </span>
      <PageHeader class="!mb-0" :header-title="pageTitle" />
    </div>
    <div
      class="grid grid-cols-1 lg:grid-cols-8 lg:divide-x lg:divide-n-weak rounded-2xl border border-n-weak bg-n-solid-1 h-full min-h-[50dvh]"
    >
      <woot-wizard
        class="hidden lg:block col-span-2 h-fit py-8 px-6"
        :global-config="globalConfig"
        :items="items"
      />
      <div class="col-span-6 flex flex-col overflow-y-auto">
        <router-view />
      </div>
    </div>
  </div>
</template>
