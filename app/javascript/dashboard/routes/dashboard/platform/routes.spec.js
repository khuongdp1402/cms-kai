import { vi } from 'vitest';
import router, { validateAuthenticateRoutePermission } from 'dashboard/routes';
import store from 'dashboard/store';

vi.mock('dashboard/store', () => ({
  default: {
    getters: { isLoggedIn: true, getCurrentUser: {} },
    dispatch: vi.fn(() => Promise.resolve()),
  },
}));

const PLATFORM_ROUTES = [
  ['kalo_platform_overview', '/app/platform/overview'],
  ['kalo_platform_shops', '/app/platform/shops'],
  ['kalo_platform_payments', '/app/platform/payments'],
  ['kalo_platform_emails', '/app/platform/emails'],
];

const SHOP_ADMIN = {
  type: 'User',
  account_id: 1,
  accounts: [{ id: 1, role: 'administrator', status: 'active' }],
};

describe('Kalo platform routes (Nền tảng)', () => {
  it.each(PLATFORM_ROUTES)('registers %s at %s', (name, path) => {
    expect(router.hasRoute(name)).toBe(true);
    expect(router.resolve({ name }).path).toBe(path);
  });

  it.each(PLATFORM_ROUTES)(
    'non-SuperAdmin is redirected from %s',
    async name => {
      store.getters.getCurrentUser = SHOP_ADMIN;
      const to = router.resolve({ name });
      const next = vi.fn();
      await validateAuthenticateRoutePermission(to, next);
      expect(next).toHaveBeenCalledWith('/app/');
    }
  );

  it.each(PLATFORM_ROUTES)('SuperAdmin may open %s', async name => {
    store.getters.getCurrentUser = { type: 'SuperAdmin', accounts: [] };
    const to = router.resolve({ name });
    const next = vi.fn();
    await validateAuthenticateRoutePermission(to, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('redirects /app/platform to the overview', () => {
    const parent = router.getRoutes().find(r => r.path === '/app/platform');
    expect(parent.redirect).toEqual({ name: 'kalo_platform_overview' });
  });

  it.each(PLATFORM_ROUTES)(
    'redirects %s when the user is not loaded yet',
    async name => {
      store.getters.getCurrentUser = {};
      const to = router.resolve({ name });
      const next = vi.fn();
      await validateAuthenticateRoutePermission(to, next);
      expect(next).toHaveBeenCalledWith('/app/');
    }
  );
});

describe('old /app/console bookmarks', () => {
  it.each([
    ['/app/console', '/app/platform/overview'],
    ['/app/console/overview', '/app/platform/overview'],
    ['/app/console/shops', '/app/platform/shops'],
    ['/app/console/payments', '/app/platform/payments'],
    ['/app/console/emails', '/app/platform/emails'],
  ])('SuperAdmin: %s opens %s', async (path, target) => {
    store.getters.getCurrentUser = { type: 'SuperAdmin', accounts: [] };
    const next = vi.fn();
    await validateAuthenticateRoutePermission(router.resolve(path), next);
    expect(next).toHaveBeenCalledWith(target);
  });

  it.each(['/app/console', '/app/console/shops'])(
    'shop user: %s opens the Console of the current shop',
    async path => {
      store.getters.getCurrentUser = SHOP_ADMIN;
      const next = vi.fn();
      await validateAuthenticateRoutePermission(router.resolve(path), next);
      expect(next).toHaveBeenCalledWith('/app/accounts/1/console');
    }
  );

  it('the shop Console is account scoped and open to every role', () => {
    const route = router.resolve('/app/accounts/1/console');
    expect(route.name).toBe('kalo_console');
    expect(route.meta.permissions).toEqual([
      'administrator',
      'agent',
      'custom_role',
    ]);
  });
});
