<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessageContext } from '../provider';
import MessageMeta from '../MessageMeta.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const { contentAttributes } = useMessageContext();
const { t } = useI18n();

const stickerInfo = computed(() => {
  return contentAttributes.value?.sticker || {};
});

const stickerUrl = computed(() => {
  const { id } = stickerInfo.value;
  if (!id) return null;
  const stickerId = String(id);
  // If absolute url is present
  if (stickerId.startsWith('http')) return stickerId;
  // Standard Zalo sticker CDN pattern
  return `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${stickerId}&size=130`;
});
</script>

<template>
  <div class="flex flex-col gap-1" data-bubble-name="sticker">
    <div class="flex items-center justify-center w-32 h-32">
      <img
        v-if="stickerUrl"
        :src="stickerUrl"
        :alt="t('KALO_CHAT_THREAD.STICKER')"
        class="object-contain max-w-full max-h-full"
        loading="lazy"
      />
      <div
        v-else
        data-test="sticker-fallback"
        class="flex items-center justify-center w-full h-full rounded-2xl bg-n-alpha-2 text-n-slate-10"
        :title="t('KALO_CHAT_THREAD.STICKER')"
      >
        <KaloIcon name="smile" class="size-10" />
      </div>
    </div>
    <MessageMeta class="text-n-slate-11" />
  </div>
</template>
