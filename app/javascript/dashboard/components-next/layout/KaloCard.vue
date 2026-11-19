<script setup>
/**
 * Kalo information group (guided UX spec §2): optional title/description with
 * actions on the right, body, optional footer. `flush` drops the body padding
 * for tables and lists that draw their own rows.
 */
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  flush: { type: Boolean, default: false },
  as: { type: String, default: 'section' },
});
</script>

<template>
  <component
    :is="as"
    data-test-id="kalo-card"
    class="flex flex-col min-w-0 overflow-hidden border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
  >
    <div
      v-if="title || description || $slots.title || $slots.actions"
      class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-n-weak"
    >
      <div class="min-w-0">
        <slot name="title">
          <h2 v-if="title" class="text-base font-bold text-n-slate-12">
            {{ title }}
          </h2>
        </slot>
        <p v-if="description" class="text-xs text-n-slate-10">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div :class="flush ? '' : 'p-5'" class="flex flex-col flex-1 min-w-0">
      <slot />
    </div>
    <div
      v-if="$slots.footer"
      class="px-5 py-3 border-t border-n-weak bg-n-solid-2"
    >
      <slot name="footer" />
    </div>
  </component>
</template>
