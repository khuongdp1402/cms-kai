<script>
// Open drawers, most recent last: only the topmost one reacts to Esc / Tab.
const openDrawers = [];
</script>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  // Tailwind max-width of the panel on screens >= sm.
  widthClass: { type: String, default: 'sm:max-w-[460px]' },
  // Bottom sheet (mobile tab bar "Thêm") instead of a right drawer.
  placement: {
    type: String,
    default: 'right',
    validator: value => ['right', 'bottom'].includes(value),
  },
});

const emit = defineEmits(['close']);

/**
 * Standard Kalo popup for create / edit / detail views (guided UX spec §2):
 * right drawer 460px on desktop, full screen on mobile, sticky header with a
 * title and a close button, scrolling body, sticky footer for the buttons.
 * Traps Tab focus, closes on Esc (topmost drawer only) and on backdrop click.
 * Attributes (data-test, aria-label…) land on the dialog panel itself.
 */
defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const titleId = useId();
const panelRef = ref(null);

const token = Symbol('kalo-drawer');
let previouslyFocused = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusables = () =>
  [...(panelRef.value?.querySelectorAll(FOCUSABLE) || [])].filter(
    el => !el.closest('[inert]')
  );

const close = () => emit('close');

// Esc meant for a popover or dialog layered above the drawer (usually
// teleported to body) must not close the drawer as well.
const isOwnKeyEvent = ({ target }) =>
  !(target instanceof Element) ||
  target === document.body ||
  !!panelRef.value?.contains(target);

// The drawer renders inside the page's scroll container: lock every
// scrolling ancestor while it is open so wheel/touch over the backdrop does
// not scroll the page behind. Only classes this drawer added are removed.
const SCROLL_LOCK_CLASS = '!overflow-hidden';
const rootRef = ref(null);
let lockedElements = [];

const lockScroll = () => {
  const scrollers = [];
  for (let el = rootRef.value?.parentElement; el; el = el.parentElement) {
    const { overflowY } = window.getComputedStyle(el);
    if (['auto', 'scroll'].includes(overflowY)) scrollers.push(el);
  }
  scrollers.push(document.body);
  lockedElements = scrollers.filter(
    el => !el.classList.contains(SCROLL_LOCK_CLASS)
  );
  lockedElements.forEach(el => el.classList.add(SCROLL_LOCK_CLASS));
};

const unlockScroll = () => {
  lockedElements.forEach(el => el.classList.remove(SCROLL_LOCK_CLASS));
  lockedElements = [];
};

const onKeydown = event => {
  if (openDrawers.at(-1) !== token) return;
  if (event.key === 'Escape') {
    if (isOwnKeyEvent(event)) close();
    return;
  }
  if (event.key !== 'Tab' || !panelRef.value) return;
  const items = focusables();
  if (!items.length) {
    event.preventDefault();
    panelRef.value.focus();
    return;
  }
  const first = items[0];
  const last = items.at(-1);
  const active = document.activeElement;
  if (!panelRef.value.contains(active)) {
    // Focus left the panel (e.g. a teleported popover): bring it back.
    if (active === document.body || !active) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.shiftKey && (active === first || active === panelRef.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

onMounted(async () => {
  openDrawers.push(token);
  previouslyFocused = document.activeElement;
  lockScroll();
  // Capture phase: also sees non-bubbling events dispatched on document.
  window.addEventListener('keydown', onKeydown, true);
  await nextTick();
  const autofocus = panelRef.value?.querySelector('[autofocus]');
  (autofocus || panelRef.value)?.focus();
});

onBeforeUnmount(() => {
  const index = openDrawers.indexOf(token);
  if (index !== -1) openDrawers.splice(index, 1);
  window.removeEventListener('keydown', onKeydown, true);
  unlockScroll();
  if (previouslyFocused?.isConnected) previouslyFocused.focus();
});

defineExpose({ close, panelRef });
</script>

<template>
  <div
    ref="rootRef"
    data-test-id="kalo-drawer-backdrop"
    class="fixed inset-0 z-50 flex bg-[rgb(20_15_13/0.44)] backdrop-blur-[3px]"
    :class="placement === 'bottom' ? 'items-end' : 'justify-end'"
    @click.self="close"
  >
    <aside
      ref="panelRef"
      v-bind="$attrs"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-labelledby="title ? titleId : undefined"
      class="flex flex-col w-full overflow-hidden outline-none bg-n-solid-1 border-n-strong shadow-[0_24px_48px_-12px_rgb(24_19_17/0.22)]"
      :class="
        placement === 'bottom'
          ? 'max-h-[85dvh] rounded-t-2xl border-t'
          : ['h-full sm:border-l', widthClass]
      "
    >
      <header
        class="flex items-start gap-3 px-5 py-4 border-b shrink-0 sm:px-6 border-n-weak bg-n-solid-1"
      >
        <div class="flex flex-col flex-1 min-w-0 gap-0.5">
          <div class="flex flex-wrap items-center min-w-0 gap-2">
            <h2
              v-if="title"
              :id="titleId"
              class="text-lg font-extrabold leading-tight truncate text-n-slate-12"
            >
              {{ title }}
            </h2>
            <slot name="headerExtra" />
          </div>
          <p v-if="description" class="text-sm text-n-slate-10">
            {{ description }}
          </p>
        </div>
        <button
          type="button"
          data-test-id="kalo-drawer-close"
          :aria-label="t('KALO_SHELL.CLOSE')"
          :title="t('KALO_SHELL.CLOSE')"
          class="grid rounded-lg size-8 shrink-0 place-content-center text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
          @click="close"
        >
          <KaloIcon name="x" class="size-5" />
        </button>
      </header>

      <div
        data-test-id="kalo-drawer-body"
        class="flex flex-col flex-1 min-h-0 gap-4 px-5 py-5 overflow-y-auto overscroll-contain sm:px-6"
      >
        <slot />
      </div>

      <footer
        v-if="$slots.footer"
        data-test-id="kalo-drawer-footer"
        class="px-5 py-3.5 border-t shrink-0 sm:px-6 border-n-weak bg-n-solid-2"
      >
        <slot name="footer" />
      </footer>
    </aside>
  </div>
</template>
