<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  withBorder: { type: Boolean, default: false },
  hideContent: { type: Boolean, default: false },
  beta: { type: Boolean, default: false },
});
const { t } = useI18n();
</script>

<template>
  <!-- Every section is its own card; withBorder (a following section) adds the gap. -->
  <section
    class="[interpolate-size:allow-keywords]"
    :class="withBorder ? 'pt-4' : 'pt-0'"
  >
    <div
      class="grid grid-cols-1 gap-4 p-5 border sm:p-6 rounded-2xl border-n-weak bg-n-solid-1"
    >
      <header
        v-if="
          title ||
          beta ||
          $slots.title ||
          description ||
          $slots.description ||
          $slots.headerActions
        "
        class="flex items-start justify-between gap-4"
      >
        <div
          v-if="
            title || beta || $slots.title || description || $slots.description
          "
          class="min-w-0"
        >
          <h4
            v-if="title || beta || $slots.title"
            class="flex items-center gap-2 text-base font-bold text-n-slate-12"
          >
            <slot name="title">{{ title }}</slot>
            <div
              v-if="beta"
              v-tooltip.top="t('GENERAL.BETA_DESCRIPTION')"
              class="text-xs uppercase text-n-iris-11 border border-1 border-n-iris-10 leading-none rounded-lg px-1 py-0.5"
            >
              {{ t('GENERAL.BETA') }}
            </div>
          </h4>
          <p
            v-if="description || $slots.description"
            class="mt-1 mb-0 text-sm text-n-slate-11"
          >
            <slot name="description">{{ description }}</slot>
          </p>
        </div>
        <div v-if="$slots.headerActions" class="shrink-0">
          <slot name="headerActions" />
        </div>
      </header>
      <div
        class="transition-[height] duration-300 ease-in-out motion-reduce:transition-none text-n-slate-12"
        :class="{ 'overflow-hidden h-0': hideContent, 'h-auto': !hideContent }"
      >
        <slot />
      </div>
    </div>
  </section>
</template>
