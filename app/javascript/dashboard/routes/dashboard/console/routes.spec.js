import { vi } from 'vitest';
import router, { validateAuthenticateRoutePermission } from 'dashboard/routes';
import store from 'dashboard/store';

vi.mock('dashboard/store', () => ({
  default: {
    getters: { isLoggedIn: true, getCurrentUser: {} },
    dispatch: vi.fn(() => Promise.resolve()),
  },
}));

const CONSOLE_ROUTES = [
  ['kalo_console_overview', '/app/console/overview'],
  ['kalo_console_shops', '/app/console/shops'],
  ['kalo_console_payments', '/app/console/payments'],
];

describe('Kalo console routes', () => {
  it.each(CONSOLE_ROUTES)('registers %s at %s', (name, path) => {
    expect(router.hasRoute(name)).toBe(true);
    expect(router.resolve({ name }).path).toBe(path);
  });

  it.each(CONSOLE_ROUTES)(
    'non-SuperAdmin is redirected from %s',
    async name => {
      store.getters.getCurrentUser = {
        type: 'User',
        accounts: [{ id: 1, role: 'administrator', status: 'active' }],
      };
      const to = router.resolve({ name });
      const next = vi.fn();
      await validateAuthenticateRoutePermission(to, next);
      expect(next).toHaveBeenCalledWith('/app/');
    }
  );

  it.each(CONSOLE_ROUTES)('SuperAdmin may open %s', async name => {
    store.getters.getCurrentUser = { type: 'SuperAdmin', accounts: [] };
    const to = router.resolve({ name });
    const next = vi.fn();
    await validateAuthenticateRoutePermission(to, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('redirects /app/console to the overview', () => {
    const parent = router.getRoutes().find(r => r.path === '/app/console');
    expect(parent.redirect).toEqual({ name: 'kalo_console_overview' });
  });

  it.each(CONSOLE_ROUTES)(
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
