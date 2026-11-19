import { FEATURE_FLAGS } from 'dashboard/featureFlags';

/**
 * Spotlight tours (guided UX spec §3.2). Every step points at a
 * `data-tour="<target>"` attribute, never at a CSS class, so restyling does not
 * break a tour; each page spec asserts its targets are rendered.
 *
 * - `route`: where "Hướng dẫn" opens the tour; `matches(route)` decides auto-start.
 * - `mobileSteps`: the short version used below 768px (multi-column steps are
 *   left out); an empty list means the tour is desktop only.
 * - Texts: KALO_GUIDE.TOUR.<TOUR>.<STEP>.{TITLE,BODY}.
 * - The Chiến dịch tour belongs to the campaign flow task (T4).
 */
export const TOUR_UI_KEY = 'kalo_tours_seen';
export const MOBILE_BREAKPOINT = 768;

const isConversationRoute = route =>
  Boolean(route.params?.conversation_id) &&
  /\/conversations\//.test(route.path || '');

export const KALO_TOURS = [
  {
    key: 'messages',
    icon: 'msg',
    route: 'home',
    matches: isConversationRoute,
    steps: [
      { target: 'chat-list', key: 'LIST', side: 'right' },
      { target: 'chat-filters', key: 'FILTERS', side: 'bottom' },
      { target: 'chat-composer', key: 'COMPOSER', side: 'top' },
      { target: 'chat-order-qr', key: 'ORDER_QR', side: 'top' },
      { target: 'chat-contact', key: 'CONTACT', side: 'bottom' },
    ],
    mobileSteps: ['COMPOSER', 'ORDER_QR'],
  },
  {
    key: 'orders',
    icon: 'bag',
    route: 'kalo_orders',
    matches: route => route.name === 'kalo_orders',
    steps: [
      { target: 'orders-create', key: 'CREATE', side: 'bottom' },
      { target: 'orders-kpis', key: 'KPIS', side: 'bottom' },
      { target: 'orders-tabs', key: 'TABS', side: 'bottom' },
      { target: 'orders-table', key: 'DRAWER', side: 'top' },
    ],
    mobileSteps: ['CREATE', 'TABS'],
  },
  {
    key: 'pos',
    icon: 'store',
    route: 'kalo_pos',
    flag: FEATURE_FLAGS.KALO_POS,
    matches: route => route.name === 'kalo_pos',
    steps: [
      { target: 'pos-search', key: 'SEARCH', side: 'bottom' },
      { target: 'pos-add', key: 'ADD', side: 'bottom' },
      { target: 'pos-products', key: 'PRODUCTS', side: 'right' },
      { target: 'pos-cart', key: 'CART', side: 'left' },
    ],
    mobileSteps: [],
  },
  {
    key: 'console',
    icon: 'set',
    route: 'kalo_console',
    adminOnly: true,
    matches: route => route.name === 'kalo_console',
    steps: [
      { target: 'console-shop', key: 'SHOP', side: 'bottom' },
      { target: 'console-plan', key: 'PLAN', side: 'bottom' },
      { target: 'console-team', key: 'TEAM', side: 'top' },
      { target: 'console-payment', key: 'PAYMENT', side: 'top' },
      { target: 'console-channels', key: 'CHANNELS', side: 'top' },
    ],
    mobileSteps: ['TEAM', 'PAYMENT'],
  },
  {
    key: 'comments',
    icon: 'quote',
    route: 'kalo_comments',
    flag: FEATURE_FLAGS.KALO_COMMENTS,
    matches: route => route.name === 'kalo_comments',
    steps: [{ target: 'comments-rules', key: 'RULES', side: 'top' }],
    mobileSteps: ['RULES'],
  },
  {
    key: 'brand',
    icon: 'spark',
    route: 'kalo_brand',
    flag: FEATURE_FLAGS.KALO_BRAND,
    matches: route => route.name === 'kalo_brand',
    steps: [
      { target: 'brand-tabs', key: 'TABS', side: 'bottom' },
      { target: 'brand-content', key: 'CONTENT', side: 'top' },
    ],
    mobileSteps: ['TABS'],
  },
];

export const findTour = key => KALO_TOURS.find(tour => tour.key === key);

export const tourSelector = target => `[data-tour="${target}"]`;

// Steps for the current width: the short list on mobile, all steps otherwise.
export const stepsForWidth = (tour, width) =>
  width < MOBILE_BREAKPOINT
    ? tour.steps.filter(step => tour.mobileSteps.includes(step.key))
    : tour.steps;

const isShown = el => Boolean(el) && el.getClientRects().length > 0;

// Steps whose target is on screen now (a page can lack some, e.g. no orders yet).
export const presentSteps = (steps, root = document) =>
  steps.filter(step => isShown(root.querySelector(tourSelector(step.target))));
