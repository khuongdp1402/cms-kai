import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import Auth from 'dashboard/api/auth';
import ConsoleLayout from './ConsoleLayout.vue';

vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));

const mountLayout = () =>
  mount(ConsoleLayout, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' }, RouterView: true },
    },
  });

describe('ConsoleLayout', () => {
  it('links back to the app home', () => {
    const link = mountLayout().find('[data-testid="back-to-app"]');
    expect(link.text()).toBe('Về ứng dụng');
    expect(link.attributes('href')).toBe('/app/');
  });

  it('logs out through Auth.logout', async () => {
    const wrapper = mountLayout();
    const button = wrapper.find('[data-testid="console-logout"]');
    expect(button.text()).toBe('Đăng xuất');
    await button.trigger('click');
    expect(Auth.logout).toHaveBeenCalledTimes(1);
  });
});
