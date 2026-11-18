// /settings/security in Kalo: SAML has no backend (no enterprise/), so the page
// reads in Vietnamese, has no "SAML is disabled" sentence and no SAML help link.
import { mountSettingsPage } from '../../specs/kaloSettingsPageEnv';
import SecurityIndex from '../Index.vue';

vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({
    shouldShow: () => false,
    shouldShowPaywall: () => false,
  }),
}));

describe('Security settings page', () => {
  const mountPage = () =>
    mountSettingsPage(SecurityIndex, { routes: ['profile_settings_index'] });

  it('shows the Vietnamese title and description', async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('h1').text()).toBe('Bảo mật');
    expect(wrapper.text()).toContain('Quản lý cài đặt bảo mật của tài khoản.');
  });

  it('replaces the SAML sentence with the password-login note', async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toMatch(/SAML/);
    const note = wrapper.find('[data-test="security-password-login"]');
    expect(note.text()).toContain('email và mật khẩu');
    expect(note.find('a').attributes('href')).toBe(
      '/app/accounts/1/profile_settings_index'
    );
  });
});
