<script setup>
/**
 * Kalo app frame (guided UX spec §2): sidebar on the left and the main area.
 * On small screens (`compact`) the sidebar gives way to the bottom tab bar.
 */
defineProps({
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <div
    data-test-id="kalo-app-shell"
    class="flex flex-grow overflow-hidden text-n-slate-12"
    :class="{ 'flex-col': compact }"
  >
    <slot v-if="!compact" name="sidebar" />
    <main
      class="flex flex-1 w-full h-full min-h-0 min-w-0 px-0 overflow-hidden bg-n-background"
    >
      <slot />
    </main>
    <slot v-if="compact" name="tabbar" />
  </div>
</template>
