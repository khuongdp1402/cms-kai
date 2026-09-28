<script setup>
import { computed } from 'vue';
import { useMessageContext } from '../provider';
import MessageMeta from '../MessageMeta.vue';

const { contentAttributes } = useMessageContext();

const stickerInfo = computed(() => {
  return contentAttributes.value?.sticker || {};
});

const stickerUrl = computed(() => {
  const { id, pack_id } = stickerInfo.value;
  if (!id) return null;
  // If absolute url is present
  if (id.startsWith('http')) return id;
  // Standard Zalo sticker CDN pattern
  return `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${id}&size=130`;
});
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="w-32 h-32 flex items-center justify-center">
      <img
        v-if="stickerUrl"
        :src="stickerUrl"
        alt="Zalo Sticker"
        class="max-w-full max-h-full object-contain"
        loading="lazy"
      />
      <div v-else class="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
        <i class="i-ri-empathize-line text-4xl" />
      </div>
    </div>
    <MessageMeta />
  </div>
</template>
