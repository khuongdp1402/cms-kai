<script setup>
import KaloIcon from 'next/icon/KaloIcon.vue';

defineProps({
  message: { type: String, required: true },
});
</script>

<template>
  <div
    data-test-id="kalo-empty-message"
    class="flex flex-col items-center justify-center h-full gap-4 px-6 text-center"
  >
    <span
      aria-hidden="true"
      class="grid rounded-[1.75rem] size-20 bg-n-blue-2 place-items-center text-n-blue-9"
    >
      <KaloIcon name="msg" class="size-10" />
    </span>
    <p class="max-w-xs text-sm font-medium text-n-slate-11">
      {{ message }}
    </p>
  </div>
</template>
