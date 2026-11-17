<script setup>
import EmojiOrIcon from 'shared/components/EmojiOrIcon.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  title: {
    type: String,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: '',
  },
  emoji: {
    type: String,
    default: '',
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['toggle']);

const onToggle = () => {
  emit('toggle');
};
</script>

<template>
  <section class="text-sm border-b border-n-weak">
    <!-- `drag-handle` lets the contact panel reorder sections (vuedraggable handle). -->
    <button
      type="button"
      class="flex items-center justify-between w-full gap-2 px-2 py-3 m-0 select-none drag-handle group/acc"
      :aria-expanded="isOpen"
      @click.stop="onToggle"
    >
      <span class="flex items-center min-w-0 gap-1.5">
        <EmojiOrIcon
          v-if="icon || emoji"
          class="inline-block w-5"
          :icon="icon"
          :emoji="emoji"
        />
        <h5
          class="mb-0 text-xs font-semibold tracking-wide uppercase truncate text-n-slate-11 group-hover/acc:text-n-slate-12"
        >
          {{ title }}
        </h5>
      </span>
      <span class="flex items-center gap-1">
        <slot name="button" />
        <KaloIcon
          name="chevron"
          class="size-4 text-n-slate-10 transition-transform duration-150 motion-reduce:transition-none"
          :class="{ 'rotate-180': isOpen }"
        />
      </span>
    </button>
    <div v-if="isOpen" :class="compact ? 'px-0 pb-3' : 'px-2 pb-4'">
      <slot />
    </div>
  </section>
</template>
