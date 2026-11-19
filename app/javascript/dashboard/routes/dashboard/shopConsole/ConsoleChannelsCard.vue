<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import { chipClass, linkClass, secondaryButtonClass } from './consoleStyles';

const { t } = useI18n();
const store = useStore();
const { accountScopedRoute } = useAccount();
const inboxes = useMapGetter('inboxes/getInboxes');

onMounted(() => store.dispatch('inboxes/get'));
</script>

<template>
  <KaloCard
    data-test="console-channels"
    :title="t('KALO_CONSOLE_SHOP.CHANNELS.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.CHANNELS.DESC')"
    flush
  >
    <template #actions>
      <router-link
        :to="accountScopedRoute('settings_inbox_new')"
        data-test="console-add-channel"
        :class="secondaryButtonClass"
      >
        {{ t('KALO_CONSOLE_SHOP.CHANNELS.ADD') }}
      </router-link>
    </template>
    <p
      v-if="!inboxes.length"
      data-test="console-channels-empty"
      class="px-5 py-4 mb-0 text-sm text-n-slate-11"
    >
      {{ t('KALO_CONSOLE_SHOP.CHANNELS.EMPTY') }}
    </p>
    <ul v-else class="flex flex-col list-none divide-y divide-n-weak">
      <li v-for="inbox in inboxes" :key="inbox.id">
        <router-link
          :to="accountScopedRoute('settings_inbox_show', { inboxId: inbox.id })"
          data-test="console-channel"
          class="flex items-center gap-3 px-5 py-3 hover:bg-n-alpha-1"
        >
          <span
            class="grid rounded-lg size-8 shrink-0 place-items-center bg-n-alpha-2 text-n-slate-11"
          >
            <ChannelIcon :inbox="inbox" class="size-4" />
          </span>
          <span
            class="flex-1 min-w-0 text-sm font-medium truncate text-n-slate-12"
          >
            {{ inbox.name }}
          </span>
          <span
            :class="[
              chipClass,
              inbox.reauthorization_required
                ? 'bg-n-ruby-3 text-n-ruby-11'
                : 'bg-n-teal-3 text-n-teal-11',
            ]"
          >
            {{
              t(
                inbox.reauthorization_required
                  ? 'KALO_CONSOLE_SHOP.CHANNELS.STATUS.REAUTH'
                  : 'KALO_CONSOLE_SHOP.CHANNELS.STATUS.OK'
              )
            }}
          </span>
        </router-link>
      </li>
    </ul>
    <template #footer>
      <router-link
        :to="accountScopedRoute('settings_inbox_list')"
        :class="linkClass"
      >
        {{ t('KALO_CONSOLE_SHOP.CHANNELS.MANAGE') }}
      </router-link>
    </template>
  </KaloCard>
</template>
