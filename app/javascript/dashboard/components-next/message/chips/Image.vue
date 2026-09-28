<script setup>
import { ref } from 'vue';
import Icon from 'next/icon/Icon.vue';
import { useSnakeCase } from 'dashboard/composables/useTransformKeys';
import { useMessageContext } from '../provider.js';

import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView.vue';

defineProps({
  attachment: {
    type: Object,
    required: true,
  },
});
const hasError = ref(false);
const showGallery = ref(false);

const { filteredCurrentChatAttachments } = useMessageContext();

const handleError = () => {
  hasError.value = true;
};
</script>

<template>
  <div
    class="overflow-hidden contain-content rounded-xl cursor-pointer flex items-center justify-center bg-black/5 dark:bg-white/5 w-[200px] h-[140px] max-w-[200px] max-h-[140px]"
    @click="showGallery = true"
  >
    <div
      v-if="hasError"
      class="flex flex-col items-center justify-center gap-1 text-xs text-center rounded-lg size-full bg-n-alpha-1 text-n-slate-11"
    >
      <Icon icon="i-lucide-circle-off" class="text-n-slate-11" />
      {{ $t('COMPONENTS.MEDIA.LOADING_FAILED') }}
    </div>
    <img
      v-else
      class="skip-context-menu rounded-lg max-w-[200px] max-h-[140px] w-auto h-auto object-contain"
      :src="attachment.dataUrl"
      @error="handleError"
    />
  </div>
  <GalleryView
    v-if="showGallery"
    v-model:show="showGallery"
    :attachment="useSnakeCase(attachment)"
    :all-attachments="filteredCurrentChatAttachments"
    @error="handleError"
    @close="() => (showGallery = false)"
  />
</template>
