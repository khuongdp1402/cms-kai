<script setup>
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  icon: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  // Flat rows sit inside a shared card (hub); others are cards of their own.
  flat: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
});
</script>

<template>
  <!-- Flat rows live inside a router-link (hub), which is already focusable. -->
  <div
    :role="clickable && !flat ? 'link' : undefined"
    :tabindex="clickable && !flat ? 0 : undefined"
    class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
    :class="[
      flat ? '' : 'border rounded-2xl border-n-weak bg-n-solid-1',
      clickable ? 'cursor-pointer hover:bg-n-alpha-1' : '',
    ]"
    @keydown.enter.self="clickable && !flat && $event.target.click()"
  >
    <slot name="leading">
      <span
        v-if="icon"
        class="grid rounded-xl size-10 shrink-0 place-items-center bg-n-blue-3 text-n-blue-11"
      >
        <KaloIcon :name="icon" class="size-5" />
      </span>
    </slot>
    <div class="flex flex-col flex-1 min-w-0 gap-0.5">
      <div class="flex items-center min-w-0 gap-2">
        <span class="text-sm font-semibold truncate text-n-slate-12">
          <slot name="title">{{ title }}</slot>
        </span>
        <slot name="badge" />
      </div>
      <div
        v-if="description || $slots.description"
        class="min-w-0 text-sm truncate text-n-slate-11"
      >
        <slot name="description">{{ description }}</slot>
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="flex items-center gap-1 shrink-0"
      @click.stop
    >
      <slot name="actions" />
    </div>
    <KaloIcon
      v-if="clickable && !$slots.actions"
      name="arrow"
      class="size-4 shrink-0 text-n-slate-10 rtl:rotate-180"
    />
  </div>
</template>
