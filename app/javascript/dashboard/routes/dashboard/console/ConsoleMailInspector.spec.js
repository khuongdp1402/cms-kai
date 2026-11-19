import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleMailInspector from './ConsoleMailInspector.vue';

vi.mock('dashboard/api/kchat/console', () => ({
  default: {
    emails: vi.fn(),
    deleteEmail: vi.fn(),
    clearEmails: vi.fn(),
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const UNSAFE_SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

const MESSAGES = [
  {
    id: 'msg-1',
    subject: 'Xác thực tài khoản Kalo',
    from: 'noreply@kalo.local',
    to: ['founder@nhamay.vn'],
    created_at: '2026-11-19T08:00:00Z',
    category: 'auth',
    html_body:
      '<p>Chào bạn, <a href="http://localhost:3005/confirm?t=1">Xác nhận</a></p>',
    text_body: 'Chào bạn, mở link http://localhost:3005/confirm?t=1',
    headers: {
      Subject: 'Xác thực tài khoản Kalo',
      From: 'noreply@kalo.local',
    },
    action_links: ['http://localhost:3005/confirm?t=1', UNSAFE_SCRIPT_URL],
  },
  {
    id: 'msg-2',
    subject: 'Hóa đơn gói Tăng trưởng',
    from: 'billing@kalo.local',
    to: ['ketoan@nhamay.vn'],
    created_at: '2026-11-19T07:00:00Z',
    category: 'billing',
    html_body: '',
    text_body: 'Casso đã đối soát 699.000đ cho shop Nhà Mây.',
    headers: { Subject: 'Hóa đơn gói Tăng trưởng' },
    action_links: [],
  },
];

const mountPage = () =>
  mount(ConsoleMailInspector, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
  });

describe('ConsoleMailInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleAPI.emails.mockResolvedValue({
      data: {
        enabled: true,
        reachable: true,
        total: MESSAGES.length,
        items: MESSAGES,
      },
    });
    consoleAPI.deleteEmail.mockResolvedValue({ data: { deleted: true } });
    consoleAPI.clearEmails.mockResolvedValue({ data: { cleared: true } });
  });

  it('loads messages, selects the first email, filters safe action links, and sandboxes HTML iframe', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="mail-item"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Xác thực tài khoản Kalo');
    expect(rows[0].text()).toContain('Xác thực');

    const linksBox = wrapper.find('[data-testid="mail-action-links"]');
    expect(linksBox.exists()).toBe(true);
    expect(linksBox.text()).toContain('http://localhost:3005/confirm?t=1');
    expect(linksBox.text()).not.toContain(UNSAFE_SCRIPT_URL);

    const iframe = wrapper.find('[data-testid="mail-html-frame"]');
    expect(iframe.exists()).toBe(true);
    expect(iframe.attributes('sandbox')).toBe('');
    expect(iframe.attributes('srcdoc')).toContain('<p>Chào bạn');
  });

  it('switches between HTML, plain text, and SMTP headers tabs', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('[data-testid="mail-tab-text"]').trigger('click');
    expect(wrapper.find('[data-testid="mail-text-body"]').text()).toContain(
      'Chào bạn, mở link http://localhost:3005/confirm?t=1'
    );

    await wrapper.find('[data-testid="mail-tab-headers"]').trigger('click');
    const headers = wrapper.find('[data-testid="mail-headers-table"]');
    expect(headers.text()).toContain('noreply@kalo.local');

    await wrapper.findAll('[data-testid="mail-item"]')[1].trigger('click');
    expect(wrapper.text()).toContain(
      'Email này chỉ có nội dung văn bản thuần.'
    );
    expect(wrapper.text()).toContain('Casso đã đối soát 699.000đ');
  });

  it('searches emails, deletes one email, and clears all via 2-step confirmation', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('[data-testid="mail-search"]').setValue('Nhà Mây');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(consoleAPI.emails).toHaveBeenLastCalledWith({ query: 'Nhà Mây' });

    await wrapper.find('[data-testid="mail-delete"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.deleteEmail).toHaveBeenCalledWith('msg-1');
    expect(useAlert).toHaveBeenCalledWith('Đã xóa email');

    await wrapper.find('[data-testid="mail-clear"]').trigger('click');
    expect(consoleAPI.clearEmails).not.toHaveBeenCalled();
    await wrapper.find('[data-testid="mail-confirm-clear"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.clearEmails).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith('Đã dọn sạch hộp thư kiểm thử');
  });

  it('renders clear notice when MailHog is unreachable', async () => {
    consoleAPI.emails.mockResolvedValue({
      data: {
        enabled: true,
        reachable: false,
        total: 0,
        items: [],
        error: 'mailhog_unreachable',
      },
    });
    const wrapper = mountPage();
    await flushPromises();

    const alertBox = wrapper.find('[data-testid="mail-unreachable"]');
    expect(alertBox.exists()).toBe(true);
    expect(alertBox.text()).toContain('MailHog nội bộ (:8025)');
  });
});
