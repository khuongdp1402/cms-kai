<script>
export default {
  props: {
    headerTitle: {
      type: String,
      default: '',
    },
    headerContent: {
      type: String,
      default: '',
    },
  },
};
</script>

<template>
  <div class="border-b border-solid border-n-weak">
    <div class="w-full px-4 pt-2 pb-0 mx-auto max-w-7xl sm:px-6">
      <h2 class="mb-1 text-xl font-extrabold truncate text-n-slate-12">
        {{ headerTitle }}
      </h2>
      <p v-if="headerContent" class="w-full mb-2 text-sm text-n-slate-11">
        {{ headerContent }}
      </p>
      <div class="-mx-1 overflow-x-auto [scrollbar-width:none]">
        <slot />
      </div>
    </div>
  </div>
</template>
