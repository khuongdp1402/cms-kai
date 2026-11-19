import { mount, flushPromises } from '@vue/test-utils';
import assistantAPI from 'dashboard/api/kchat/assistant';
import KaloAssistantDrawer from '../KaloAssistantDrawer.vue';
import { resetAssistantState } from '../useKaloAssistant';
import { createAssistantEnv, apiError } from './assistantTestEnv';

vi.mock('dashboard/api/kchat/assistant', () => ({
  default: { send: vi.fn() },
}));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { aiHealth: vi.fn() },
}));

const wrappers = [];
const mountDrawer = () => {
  const env = createAssistantEnv();
  const wrapper = mount(KaloAssistantDrawer, {
    attachTo: document.body,
    global: { plugins: env.plugins },
  });
  wrappers.push(wrapper);
  return wrapper;
};
const id = (wrapper, name) =>
  wrapper.find(`[data-test-id="kalo-assistant-${name}"]`);
const typeAndSend = async (wrapper, text) => {
  await id(wrapper, 'input').setValue(text);
  await id(wrapper, 'send').trigger('click');
  await flushPromises();
};

beforeEach(() => {
  resetAssistantState();
  vi.clearAllMocks();
});
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()));

describe('KaloAssistantDrawer', () => {
  it('shows the title, three modes and starters of the active mode', async () => {
    const wrapper = mountDrawer();
    expect(wrapper.text()).toContain('Trợ lý Kalo');
    const chips = ['help', 'write', 'insights'].map(m =>
      id(wrapper, `mode-${m}`).text()
    );
    expect(chips).toEqual(['Hỏi cách dùng', 'Viết nội dung', 'Tóm tắt tuần']);
    expect(
      wrapper.findAll('[data-test-id="kalo-assistant-starter"]')
    ).toHaveLength(3);
    await id(wrapper, 'mode-write').trigger('click');
    expect(id(wrapper, 'mode-write').attributes('aria-pressed')).toBe('true');
    expect(wrapper.text()).toContain('Viết bài đăng giới thiệu sản phẩm mới');
  });

  it('sends the chosen mode and renders both bubbles', async () => {
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Dòng 1\nDòng 2' } });
    const wrapper = mountDrawer();
    await id(wrapper, 'mode-insights').trigger('click');
    await typeAndSend(wrapper, 'Tuần này sao?');
    expect(assistantAPI.send).toHaveBeenCalledWith({
      message: 'Tuần này sao?',
      mode: 'insights',
      history: [],
    });
    expect(id(wrapper, 'user').text()).toBe('Tuần này sao?');
    expect(id(wrapper, 'assistant').text()).toContain('Dòng 1');
    expect(id(wrapper, 'starters').exists()).toBe(false);
    expect(id(wrapper, 'input').element.value).toBe('');
  });

  it('sends a starter prompt on click', async () => {
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Ok' } });
    const wrapper = mountDrawer();
    await wrapper
      .find('[data-test-id="kalo-assistant-starter"]')
      .trigger('click');
    await flushPromises();
    expect(assistantAPI.send.mock.calls[0][0].message).toBe(
      'Làm sao để tạo đơn hàng đầu tiên?'
    );
  });

  it('Enter sends, Shift+Enter does not', async () => {
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Ok' } });
    const wrapper = mountDrawer();
    await id(wrapper, 'input').setValue('Xin chào');
    await id(wrapper, 'input').trigger('keydown', {
      key: 'Enter',
      shiftKey: true,
    });
    expect(assistantAPI.send).not.toHaveBeenCalled();
    await id(wrapper, 'input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(assistantAPI.send).toHaveBeenCalledTimes(1);
  });

  it('never injects AI output as HTML', async () => {
    assistantAPI.send.mockResolvedValue({
      data: { reply: '<img src=x onerror="alert(1)"><b>đậm</b>' },
    });
    const wrapper = mountDrawer();
    await typeAndSend(wrapper, 'Hỏi');
    const bubble = id(wrapper, 'assistant');
    expect(bubble.find('img').exists()).toBe(false);
    expect(bubble.find('b').exists()).toBe(false);
    expect(bubble.text()).toContain('<b>đậm</b>');
  });

  it('copies an assistant reply only', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Nội dung' } });
    const wrapper = mountDrawer();
    await typeAndSend(wrapper, 'Hỏi');
    expect(
      id(wrapper, 'user').find('[data-test-id="kalo-assistant-copy"]').exists()
    ).toBe(false);
    await id(wrapper, 'copy').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('Nội dung');
    expect(id(wrapper, 'copy').text()).toBe('Đã sao chép');
  });

  it.each([
    [apiError(403, 'subscription_expired'), 'Hết hạn dùng thử'],
    [apiError(429, 'rate_limited'), 'Đợi khoảng một phút'],
    [apiError(502, 'ai_unavailable'), 'Trợ lý tạm thời không dùng được'],
    [apiError(503, 'ai_not_configured'), 'Trợ lý tạm thời không dùng được'],
  ])('shows a Vietnamese error for %j', async (error, text) => {
    assistantAPI.send.mockRejectedValue(error);
    const wrapper = mountDrawer();
    await typeAndSend(wrapper, 'Hỏi');
    expect(id(wrapper, 'error').text()).toContain(text);
    // The text goes back into the input for a retry.
    expect(id(wrapper, 'input').element.value).toBe('Hỏi');
    expect(id(wrapper, 'user').exists()).toBe(false);
  });

  it('links expired trials to billing and closes the drawer', async () => {
    assistantAPI.send.mockRejectedValue(apiError(403, 'subscription_expired'));
    const wrapper = mountDrawer();
    await typeAndSend(wrapper, 'Hỏi');
    const link = id(wrapper, 'billing-link');
    expect(link.attributes('href')).toBe('/billing');
    await link.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('shows loading dots while waiting and disables send', async () => {
    let resolve;
    assistantAPI.send.mockReturnValue(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountDrawer();
    await typeAndSend(wrapper, 'Hỏi');
    expect(id(wrapper, 'loading').exists()).toBe(true);
    await id(wrapper, 'input').setValue('Tiếp');
    expect(id(wrapper, 'send').attributes('disabled')).toBeDefined();
    resolve({ data: { reply: 'Ok' } });
    await flushPromises();
    expect(id(wrapper, 'loading').exists()).toBe(false);
  });

  it('focuses the input when it opens', async () => {
    const wrapper = mountDrawer();
    await flushPromises();
    expect(document.activeElement).toBe(id(wrapper, 'input').element);
  });
});
