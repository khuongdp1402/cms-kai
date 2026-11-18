import router from 'dashboard/routes';

describe('Kalo shell routes', () => {
  it.each([
    ['kalo_orders', '/app/accounts/1/orders'],
    ['kalo_pos', '/app/accounts/1/pos'],
    ['kalo_marketing', '/app/accounts/1/marketing'],
    ['kalo_reports', '/app/accounts/1/reports'],
    ['kalo_settings_hub', '/app/accounts/1/settings/hub'],
  ])('registers %s at %s', (name, path) => {
    expect(router.hasRoute(name)).toBe(true);
    expect(router.resolve({ name, params: { accountId: 1 } }).path).toBe(path);
  });

  it('/settings lands on the settings hub', () => {
    const settingsHome = router
      .getRoutes()
      .find(route => route.name === 'settings_home');
    expect(settingsHome.path).toBe('/app/accounts/:accountId/settings');
    const target = settingsHome.redirect({ params: { accountId: '1' } });
    expect(router.resolve(target).path).toBe('/app/accounts/1/settings/hub');
  });
});
