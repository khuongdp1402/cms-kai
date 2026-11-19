import { computed, ref } from 'vue';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useStore } from 'dashboard/composables/store';
import {
  TOUR_UI_KEY,
  presentSteps,
  stepsForWidth,
  tourSelector,
} from './kaloTours';

export const activeTourKey = ref(null);

let activeDriver = null;

export const stopActiveTour = () => {
  if (activeDriver?.isActive()) activeDriver.destroy();
  activeDriver = null;
};

/**
 * Runs `tour` with driver.js. Buttons: Quay lại / Tiếp / Xong plus a "Bỏ qua"
 * button added to the footer; progress "Bước x/y". Calls `onClose` once,
 * however the tour ends (done, skip, Esc).
 */
export const runTour = (tour, { t, width = window.innerWidth, onClose }) => {
  const steps = presentSteps(stepsForWidth(tour, width));
  if (!steps.length) return false;
  stopActiveTour();

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
  activeTourKey.value = tour.key;
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
