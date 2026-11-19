<script setup>
import { computed, ref, useSlots, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPageHeader from './KaloPageHeader.vue';
import KaloDrawer from './KaloDrawer.vue';

/**
 * The one page frame of Kalo (guided UX spec §2): sticky KaloPageHeader, then
 * optional left column (filters, lists), main content (cards on the canvas)
 * and optional right column (details, help). Under 1024px the side columns
 * move into KaloDrawers opened from buttons in the header.
 * Only the page body scrolls; `footer` stays stuck to the bottom.
 */
const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  maxWidthClass: { type: String, default: 'max-w-[1360px]' },
  leftTitle: { type: String, default: '' },
  rightTitle: { type: String, default: '' },
  leftWidthClass: { type: String, default: 'w-[264px]' },
  rightWidthClass: { type: String, default: 'w-[340px]' },
});

const DESKTOP_MIN_WIDTH = 1024;

const { t } = useI18n();
const slots = useSlots();
const { width } = useWindowSize();

const isDesktop = computed(() => width.value >= DESKTOP_MIN_WIDTH);
const openPanel = ref(null);

const leftLabel = computed(() => props.leftTitle || t('KALO_SHELL.PAGE.LEFT'));
const rightLabel = computed(
  () => props.rightTitle || t('KALO_SHELL.PAGE.RIGHT')
);
const showPanelButtons = computed(
  () => !isDesktop.value && (slots.left || slots.right)
);

watch(isDesktop, desktop => {
  if (desktop) openPanel.value = null;
});

const open = panel => {
  openPanel.value = panel;
};
const close = () => {
  openPanel.value = null;
};

defineExpose({ open, close });
</script>

<template>
  <section
    data-test-id="kalo-page"
    class="flex flex-col flex-1 w-full h-full min-w-0 overflow-y-auto bg-n-background"
  >
    <slot name="header" :is-desktop="isDesktop" :open="open">
      <KaloPageHeader
        :title="title"
        :description="description"
        :max-width-class="maxWidthClass"
      >
        <template v-if="$slots.leading" #leading>
          <slot name="leading" />
        </template>
        <template v-if="$slots.actions || showPanelButtons" #actions>
          <template v-if="showPanelButtons">
            <button
              v-if="$slots.left"
              type="button"
              data-test-id="kalo-page-open-left"
              class="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2"
              @click="open('left')"
            >
              <KaloIcon name="tag" class="size-4" />
              {{ leftLabel }}
            </button>
            <button
              v-if="$slots.right"
              type="button"
              data-test-id="kalo-page-open-right"
              class="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2"
              @click="open('right')"
            >
              <KaloIcon name="book" class="size-4" />
              {{ rightLabel }}
            </button>
          </template>
          <slot name="actions" />
        </template>
        <template v-if="$slots.tabs" #tabs>
          <slot name="tabs" />
        </template>
      </KaloPageHeader>
    </slot>

    <slot name="subHeader" />

    <div
      class="flex flex-1 w-full gap-5 px-4 py-6 mx-auto sm:px-6 lg:px-8"
      :class="maxWidthClass"
    >
      <aside
        v-if="$slots.left && isDesktop"
        data-test-id="kalo-page-left"
        class="flex flex-col gap-4 shrink-0 self-start sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto"
        :class="leftWidthClass"
      >
        <slot name="left" />
      </aside>
      <div
        data-test-id="kalo-page-main"
        class="flex flex-col flex-1 min-w-0 gap-5"
      >
        <slot />
      </div>
      <aside
        v-if="$slots.right && isDesktop"
        data-test-id="kalo-page-right"
        class="flex flex-col gap-4 shrink-0 self-start sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto"
        :class="rightWidthClass"
      >
        <slot name="right" />
      </aside>
    </div>

    <div v-if="$slots.footer" class="sticky bottom-0 z-10 mt-auto">
      <slot name="footer" />
    </div>

    <KaloDrawer
      v-if="openPanel === 'left' && $slots.left"
      data-test-id="kalo-page-left-drawer"
      :title="leftLabel"
      @close="close"
    >
      <slot name="left" />
    </KaloDrawer>
    <KaloDrawer
      v-if="openPanel === 'right' && $slots.right"
      data-test-id="kalo-page-right-drawer"
      :title="rightLabel"
      @close="close"
    >
      <slot name="right" />
    </KaloDrawer>
  </section>
</template>
