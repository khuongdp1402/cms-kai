<script setup>
import { vOnClickOutside } from '@vueuse/components';
import Button from 'dashboard/components-next/button/Button.vue';

defineProps({
  headerTitle: {
    type: String,
    default: '',
  },
  buttonLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['click', 'close']);

const handleButtonClick = () => {
  emit('click');
};
</script>

<template>
  <section class="flex flex-col w-full h-full overflow-hidden bg-transparent">
    <header class="sticky top-0 z-10">
      <div class="w-full max-w-[1360px] mx-auto">
        <div class="flex items-center justify-between w-full h-14 gap-2">
          <span class="text-base font-bold text-n-slate-12">
            {{ headerTitle }}
          </span>
          <div
            v-on-click-outside="[
              () => emit('close'),
              // This will prevent closing the modal when the editor Create link popup is open
              { ignore: ['dialog.ProseMirror-prompt-backdrop'] },
            ]"
            class="relative group/campaign-button"
          >
            <Button
              :label="buttonLabel"
              icon="i-lucide-plus"
              size="sm"
              class="group-hover/campaign-button:brightness-110"
              @click="handleButtonClick"
            />
            <slot name="action" />
          </div>
        </div>
      </div>
    </header>
    <main class="flex-1 overflow-y-auto">
      <div class="w-full max-w-[1360px] mx-auto py-3">
        <slot name="default" />
      </div>
    </main>
  </section>
</template>
