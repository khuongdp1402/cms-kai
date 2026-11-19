<script setup>
import { ref, watch, nextTick, useId } from 'vue';

/**
 * Name tooltip for icon-only rail entries (guided UX spec §2): shown on hover
 * and on keyboard focus while `enabled` (the collapsed rail), linked to the
 * first link/button inside through aria-describedby.
 */
const props = defineProps({
  label: { type: String, required: true },
  enabled: { type: Boolean, default: false },
});

const tooltipId = `kalo-rail-tooltip-${useId()}`;
const rootRef = ref(null);
const visible = ref(false);

const show = () => {
  if (props.enabled) visible.value = true;
};
const hide = () => {
  visible.value = false;
};

watch(
  () => props.enabled,
  enabled => {
    if (!enabled) hide();
  }
);

watch(visible, async isVisible => {
  await nextTick();
  const target = rootRef.value?.querySelector('a[href], button');
  if (!target) return;
  if (isVisible) target.setAttribute('aria-describedby', tooltipId);
  else target.removeAttribute('aria-describedby');
});
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <span
      v-if="enabled && visible"
      :id="tooltipId"
      role="tooltip"
      data-test-id="kalo-rail-tooltip"
      class="absolute z-50 px-2.5 py-1.5 text-xs font-semibold -translate-y-1/2 rounded-lg shadow-lg pointer-events-none top-1/2 ltr:left-full rtl:right-full ltr:ml-3 rtl:mr-3 whitespace-nowrap bg-n-slate-12 text-n-solid-1"
    >
      {{ label }}
    </span>
  </div>
</template>
