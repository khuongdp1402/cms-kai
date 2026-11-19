<script setup>
/**
 * Standard Kalo v3 workspace shell (`max-w-[1360px]` centered container on warm canvas).
 */
defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  maxWidthClass: {
    type: String,
    default: 'max-w-[1360px]',
  },
});
</script>

<template>
  <section
    class="flex flex-col flex-1 w-full h-full min-w-0 overflow-y-auto bg-n-background"
  >
    <header
      class="sticky top-0 z-20 border-b shrink-0 bg-n-surface-1/95 backdrop-blur-md border-n-weak"
    >
      <div
        class="flex flex-col w-full gap-3 px-5 py-3.5 mx-auto sm:px-6 lg:px-8"
        :class="maxWidthClass"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center min-w-0 gap-3">
            <slot name="leading" />
            <div v-if="title || subtitle" class="min-w-0">
              <h1
                v-if="title"
                class="text-lg font-extrabold tracking-tight sm:text-xl text-n-slate-12"
              >
                {{ title }}
              </h1>
              <p v-if="subtitle" class="text-xs sm:text-sm text-n-slate-10">
                {{ subtitle }}
              </p>
            </div>
            <slot name="headerTabs" />
          </div>
          <div
            v-if="$slots.actions"
            class="flex flex-wrap items-center gap-2 shrink-0"
          >
            <slot name="actions" />
          </div>
        </div>
        <slot name="subHeader" />
      </div>
    </header>

    <div
      class="flex flex-col flex-1 w-full gap-5 px-5 py-6 mx-auto sm:px-6 lg:px-8"
      :class="maxWidthClass"
    >
      <slot />
    </div>
  </section>
</template>
