<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import CommentAutomationSettings from './CommentAutomationSettings.vue';

const SOCIAL_CHANNELS = ['Channel::FacebookPage', 'Channel::Instagram'];

const { t } = useI18n();
const store = useStore();
const { accountScopedRoute, currentAccount } = useAccount();

// Comment rules only act on Facebook / Instagram inboxes. Without one, the
// page explains that and points to connecting a channel instead of showing
// rules that look active but do nothing.
const hasSocialInbox = computed(() => {
  const inboxes = store.getters['inboxes/getInboxes'];
  if (!Array.isArray(inboxes)) return true;
  return inboxes.some(inbox => SOCIAL_CHANNELS.includes(inbox.channel_type));
});

const connectRoute = computed(() => accountScopedRoute('settings_inbox_new'));

// Same rule as the channel picker (ChannelItem): Facebook/Instagram can be
// connected only with the account feature on and the Meta app configured.
// Otherwise the picker shows them as "Sắp có", so do not send the owner to a
// locked screen: explain instead.
const canConnectSocial = computed(() => {
  const features = currentAccount.value?.features || {};
  const config = window.chatwootConfig || {};
  return (
    (!!features.channel_facebook && !!config.fbAppId) ||
    (!!features.channel_instagram && !!config.instagramAppId)
  );
});
</script>

<template>
  <KaloPage
    data-test="kalo-comments-page"
    :title="t('KALO_CONSOLE_SHOP.PAGES.COMMENTS.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAGES.COMMENTS.DESC')"
  >
    <CommentAutomationSettings
      v-if="hasSocialInbox"
      data-tour="comments-rules"
    />
    <KaloCard
      v-else
      data-tour="comments-rules"
      data-test="comments-no-channel"
      class="max-w-2xl"
    >
      <div class="flex flex-col items-start gap-3 sm:flex-row">
        <span
          class="grid rounded-xl size-11 shrink-0 place-items-center bg-n-blue-2 text-n-blue-11"
        >
          <KaloIcon name="quote" class="size-6" />
        </span>
        <div class="flex flex-col gap-1.5">
          <h2 class="text-base font-bold text-n-slate-12">
            {{ t('KALO_POLISH3.COMMENTS.NO_CHANNEL_TITLE') }}
          </h2>
          <p
            data-test="comments-no-channel-body"
            class="mb-0 text-sm text-n-slate-11"
          >
            {{
              canConnectSocial
                ? t('KALO_POLISH3.COMMENTS.NO_CHANNEL_BODY')
                : t('KALO_POLISH4.COMMENTS.SOCIAL_SOON_BODY')
            }}
          </p>
          <router-link
            v-if="canConnectSocial"
            :to="connectRoute"
            data-test="comments-connect-channel"
            class="inline-flex items-center self-start gap-1.5 px-3.5 py-2 mt-1 text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:opacity-90"
          >
            <KaloIcon name="plug" class="size-4" />
            {{ t('KALO_POLISH3.COMMENTS.NO_CHANNEL_CTA') }}
          </router-link>
        </div>
      </div>
    </KaloCard>
  </KaloPage>
</template>
