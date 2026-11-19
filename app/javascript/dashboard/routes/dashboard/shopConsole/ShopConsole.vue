<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import { getUserRole } from 'dashboard/helper/permissionsHelper';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import ConsoleShopCard from './ConsoleShopCard.vue';
import ConsolePlanCard from './ConsolePlanCard.vue';
import ConsoleTeamCard from './ConsoleTeamCard.vue';
import ConsolePaymentCard from './ConsolePaymentCard.vue';
import ConsoleChannelsCard from './ConsoleChannelsCard.vue';

const { t } = useI18n();
const { accountId, accountScopedRoute } = useAccount();
const currentUser = useMapGetter('getCurrentUser');

const isAdmin = computed(
  () => getUserRole(currentUser.value, accountId.value) === 'administrator'
);
</script>

<template>
  <KaloPage
    data-test="kalo-shop-console"
    :title="t('KALO_CONSOLE_SHOP.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.DESC')"
  >
    <template #leading>
      <span
        class="grid rounded-xl size-9 place-items-center bg-n-blue-3 text-n-blue-11 shrink-0"
      >
        <KaloIcon name="store" class="size-5" />
      </span>
    </template>

    <div
      v-if="isAdmin"
      class="grid items-start gap-5 md:grid-cols-2"
      data-test="console-sections"
    >
      <ConsoleShopCard data-tour="console-shop" />
      <ConsolePlanCard data-tour="console-plan" />
      <ConsoleTeamCard class="md:col-span-2" data-tour="console-team" />
      <ConsolePaymentCard data-tour="console-payment" />
      <ConsoleChannelsCard data-tour="console-channels" />
    </div>

    <KaloCard
      v-else
      data-test="console-agent-only"
      :title="t('KALO_CONSOLE_SHOP.AGENT_ONLY.TITLE')"
      class="max-w-2xl"
    >
      <p class="mb-4 text-sm text-n-slate-11">
        {{ t('KALO_CONSOLE_SHOP.AGENT_ONLY.TEXT') }}
      </p>
      <router-link
        :to="accountScopedRoute('profile_settings_index')"
        data-test="console-profile-link"
        class="inline-flex items-center self-start gap-2 h-9 px-4 text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:opacity-90"
      >
        <KaloIcon name="user" class="size-4" />
        {{ t('KALO_CONSOLE_SHOP.AGENT_ONLY.PROFILE') }}
      </router-link>
    </KaloCard>
  </KaloPage>
</template>
