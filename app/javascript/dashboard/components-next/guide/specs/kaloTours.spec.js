import { mount, flushPromises } from '@vue/test-utils';
import { driver } from 'driver.js';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloTourHost from '../KaloTourHost.vue';
import { KALO_TOURS, findTour, stepsForWidth } from '../kaloTours';
import { runTour, stopActiveTour } from '../useKaloTour';
import { createGuideEnv } from './guideTestEnv';

vi.mock('driver.js', () => ({ driver: vi.fn() }));
vi.mock('driver.js/dist/driver.css', () => ({}));

// driver.js stand-in: records the config and lets the spec end the tour.
let lastConfig;
const fakeDriver = () => {
  const instance = {
    active: false,
    drive: vi.fn(() => {
      instance.active = true;
    }),
    isActive: () => instance.active,
    isLastStep: vi.fn(() => false),
    destroy: vi.fn(() => {
      instance.active = false;
      lastConfig.onDestroyed();
    }),
  };
  return instance;
};

const lookup = path =>
  path.split('.').reduce((node, key) => node?.[key], viMessages);

const t = (key, params = {}) =>
  Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    lookup(key)
  );

const addTargets = targets => {
  document.body.innerHTML = targets
    .map(target => `<div data-tour="${target}"></div>`)
    .join('');
};

describe('Kalo tours', () => {
  let rects;
  beforeEach(() => {
    vi.useFakeTimers();
    lastConfig = null;
    driver.mockReset();
    driver.mockImplementation(config => {
      lastConfig = config;
      return fakeDriver();
    });
    // jsdom has no layout: treat every element as on screen.
    rects = vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}]);
    window.innerWidth = 1280;
  });
  afterEach(() => {
    stopActiveTour();
    rects.mockRestore();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('has Vietnamese texts for every tour and step', () => {
    KALO_TOURS.forEach(tour => {
      const base = `KALO_GUIDE.TOUR.${tour.key.toUpperCase()}`;
      expect(lookup(`${base}.NAME`)).toBeTruthy();
      tour.steps.forEach(step => {
        expect(lookup(`${base}.${step.key}.TITLE`)).toBeTruthy();
        expect(lookup(`${base}.${step.key}.BODY`)).toBeTruthy();
      });
      tour.mobileSteps.forEach(key => {
        expect(tour.steps.map(step => step.key)).toContain(key);
      });
    });
  });

  it('uses the short version below 768px', () => {
    const orders = findTour('orders');
    expect(stepsForWidth(orders, 400).map(s => s.key)).toEqual([
      'CREATE',
      'TABS',
    ]);
    expect(stepsForWidth(orders, 1280)).toHaveLength(4);
    expect(stepsForWidth(findTour('pos'), 400)).toEqual([]);
  });

  it('runs driver.js with Kalo buttons, "Bước x/y" and a Bỏ qua button', () => {
    addTargets(['orders-create', 'orders-tabs']);
    const onClose = vi.fn();
    expect(runTour(findTour('orders'), { t, onClose })).toBe(true);
    expect(lastConfig).toMatchObject({
      popoverClass: 'kalo-tour',
      showProgress: true,
      progressText: 'Bước {{current}}/{{total}}',
      nextBtnText: 'Tiếp',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Xong',
    });
    // Missing targets (no orders yet) are left out.
    expect(lastConfig.steps.map(s => s.element)).toEqual([
      '[data-tour="orders-create"]',
      '[data-tour="orders-tabs"]',
    ]);
    expect(lastConfig.steps[0].popover.title).toBe('Tạo đơn');

    const footer = document.createElement('div');
    const current = { isLastStep: () => false, destroy: vi.fn() };
    lastConfig.onPopoverRender({ footer }, { driver: current });
    const skip = footer.querySelector('[data-test-id="kalo-tour-skip"]');
    expect(skip.textContent).toBe('Bỏ qua');
    skip.click();
    expect(current.destroy).toHaveBeenCalled();

    lastConfig.onDestroyed();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not start when no target is on the page', () => {
    expect(runTour(findTour('orders'), { t })).toBe(false);
    expect(driver).not.toHaveBeenCalled();
  });

  describe('KaloTourHost', () => {
    const mountHost = async ({ route = 'kalo_orders', query, ...env } = {}) => {
      const guide = createGuideEnv(env);
      await guide.router.push({
        name: route,
        params: { accountId: 1 },
        query,
      });
      const wrapper = mount(KaloTourHost, {
        global: { plugins: [guide.router, guide.store, guide.i18n] },
      });
      await flushPromises();
      return { wrapper, ...guide };
    };

    it('starts a module tour on the first visit and marks it seen when closed', async () => {
      addTargets([
        'orders-create',
        'orders-kpis',
        'orders-tabs',
        'orders-table',
      ]);
      const { store, wrapper } = await mountHost();
      expect(driver).toHaveBeenCalledTimes(1);
      expect(lastConfig.steps).toHaveLength(4);
      lastConfig.onDestroyed();
      expect(store.state.uiSettings.kalo_tours_seen).toEqual({ orders: true });
      wrapper.unmount();
    });

    it('waits until the page has rendered every target', async () => {
      const { wrapper } = await mountHost();
      expect(driver).not.toHaveBeenCalled();
      addTargets([
        'orders-create',
        'orders-kpis',
        'orders-tabs',
        'orders-table',
      ]);
      await vi.advanceTimersByTimeAsync(300);
      expect(driver).toHaveBeenCalledTimes(1);
      expect(lastConfig.steps).toHaveLength(4);
      wrapper.unmount();
    });

    it('after a short wait runs the part of the tour that is on the page', async () => {
      addTargets(['orders-create']);
      const { wrapper } = await mountHost();
      await vi.advanceTimersByTimeAsync(1000);
      expect(driver).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3500);
      expect(driver).toHaveBeenCalledTimes(1);
      expect(lastConfig.steps).toHaveLength(1);
      wrapper.unmount();
    });

    it('does not start a tour that was already seen', async () => {
      addTargets(['orders-create']);
      const { wrapper } = await mountHost({
        uiSettings: { kalo_tours_seen: { orders: true } },
      });
      await vi.advanceTimersByTimeAsync(7000);
      expect(driver).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('replays a seen tour asked for with ?tour= and drops the query', async () => {
      addTargets([
        'orders-create',
        'orders-kpis',
        'orders-tabs',
        'orders-table',
      ]);
      const { router, wrapper } = await mountHost({
        query: { tour: 'orders' },
        uiSettings: { kalo_tours_seen: { orders: true } },
      });
      expect(driver).toHaveBeenCalledTimes(1);
      await flushPromises();
      expect(router.currentRoute.value.query).toEqual({});
      wrapper.unmount();
    });

    it('skips tours of modules that are off', async () => {
      addTargets(['pos-search']);
      const { wrapper } = await mountHost({
        route: 'kalo_pos',
        features: { kalo_comments: true },
      });
      await vi.advanceTimersByTimeAsync(7000);
      expect(driver).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('on a phone runs only the short version, and leaves desktop-only tours for later', async () => {
      window.innerWidth = 400;
      addTargets([
        'orders-create',
        'orders-kpis',
        'orders-tabs',
        'orders-table',
      ]);
      const orders = await mountHost();
      expect(lastConfig.steps.map(s => s.element)).toEqual([
        '[data-tour="orders-create"]',
        '[data-tour="orders-tabs"]',
      ]);
      orders.wrapper.unmount();

      driver.mockClear();
      addTargets(['pos-search', 'pos-add', 'pos-products', 'pos-cart']);
      const pos = await mountHost({ route: 'kalo_pos' });
      await vi.advanceTimersByTimeAsync(7000);
      expect(driver).not.toHaveBeenCalled();
      expect(pos.store.state.uiSettings.kalo_tours_seen).toBeUndefined();
      pos.wrapper.unmount();
    });
  });
});
