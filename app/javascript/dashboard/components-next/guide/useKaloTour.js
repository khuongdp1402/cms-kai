import { computed, ref } from 'vue';
import { useStore } from 'dashboard/composables/store';
import {
  TOUR_UI_KEY,
  presentSteps,
  stepsForWidth,
  tourSelector,
} from './kaloTours';

export const activeTourKey = ref(null);

let activeDriver = null;
let removeKeyListener = null;

export const stopActiveTour = () => {
  if (activeDriver?.isActive()) activeDriver.destroy();
  activeDriver = null;
  // Also frees the slot of a tour still loading driver.js.
  activeTourKey.value = null;
};

// driver.js (and its CSS) only loads when a tour actually runs.
const loadDriver = async () => {
  const [{ driver }] = await Promise.all([
    import('driver.js'),
    import('driver.js/dist/driver.css'),
  ]);
  return driver;
};

// driver's own keyboard control moves between steps with the arrow keys even
// while the user types in the highlighted composer, so it is off: the buttons
// move between steps and Esc (handled here) closes the tour.
const listenForEscape = instance => {
  const onKeydown = event => {
    if (event.key !== 'Escape' || !instance.isActive()) return;
    event.stopPropagation();
    instance.destroy();
  };
  window.addEventListener('keydown', onKeydown, true);
  return () => window.removeEventListener('keydown', onKeydown, true);
};

/**
 * Runs `tour` with driver.js. Buttons: Quay lại / Tiếp / Xong plus a "Bỏ qua"
 * button added to the footer; progress "Bước x/y". Calls `onClose` once,
 * however the tour ends (done, skip, Esc). Resolves to whether it started.
 */
export const runTour = async (
  tour,
  { t, width = window.innerWidth, onClose }
) => {
  const steps = presentSteps(stepsForWidth(tour, width));
  if (!steps.length) return false;
  stopActiveTour();
  // Claim the slot before the lazy import so the host does not start it twice.
  activeTourKey.value = tour.key;
  const driver = await loadDriver();
  if (activeTourKey.value !== tour.key) return false;

  const instance = driver({
    popoverClass: 'kalo-tour',
    showProgress: steps.length > 1,
    progressText: t('KALO_GUIDE.TOUR.PROGRESS', {
      current: '{{current}}',
      total: '{{total}}',
    }),
    nextBtnText: t('KALO_GUIDE.TOUR.NEXT'),
    prevBtnText: t('KALO_GUIDE.TOUR.BACK'),
    doneBtnText: t('KALO_GUIDE.TOUR.DONE'),
    showButtons: ['next', 'previous'],
    allowKeyboardControl: false,
    stagePadding: 6,
    stageRadius: 14,
    overlayOpacity: 0.6,
    onPopoverRender: (popover, { driver: current }) => {
      if (current.isLastStep()) return;
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'driver-popover-footer-btn kalo-tour-skip';
      skip.dataset.testId = 'kalo-tour-skip';
      skip.textContent = t('KALO_GUIDE.TOUR.SKIP');
      skip.addEventListener('click', () => current.destroy());
      popover.footer.insertBefore(skip, popover.footer.firstChild);
    },
    onDestroyed: () => {
      removeKeyListener?.();
      removeKeyListener = null;
      activeDriver = null;
      activeTourKey.value = null;
      onClose?.();
    },
    steps: steps.map(step => ({
      element: tourSelector(step.target),
      popover: {
        title: t(`KALO_GUIDE.TOUR.${tour.key.toUpperCase()}.${step.key}.TITLE`),
        description: t(
          `KALO_GUIDE.TOUR.${tour.key.toUpperCase()}.${step.key}.BODY`
        ),
        side: width < 768 ? 'bottom' : step.side,
        align: 'start',
      },
    })),
  });
  activeDriver = instance;
  removeKeyListener?.();
  removeKeyListener = listenForEscape(instance);
  instance.drive();
  return true;
};

// Seen state per user per tour, in uiSettings.
export function useKaloTourSeen() {
  const store = useStore();
  const seen = computed(() => store.getters.getUISettings?.[TOUR_UI_KEY] || {});
  const isSeen = key => Boolean(seen.value[key]);
  const markSeen = key => {
    const settings = store.getters.getUISettings || {};
    store.dispatch('updateUISettings', {
      uiSettings: {
        ...settings,
        [TOUR_UI_KEY]: { ...(settings[TOUR_UI_KEY] || {}), [key]: true },
      },
    });
  };
  return { seen, isSeen, markSeen };
}
