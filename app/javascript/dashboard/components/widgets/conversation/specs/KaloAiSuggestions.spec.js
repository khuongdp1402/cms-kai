import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import KaloAiSuggestions from '../KaloAiSuggestions.vue';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { chatReply: vi.fn() },
}));

let nextId = 1;
const msg = (type, content, extra = {}) => {
  nextId += 1;
  return {
    id: nextId,
    message_type: type,
    content,
    private: false,
    ...extra,
  };
};
const incoming = (content, extra) => msg(0, content, extra);
const outgoing = (content, extra) => msg(1, content, extra);

const mountIt = (messages, props = {}) =>
  mount(KaloAiSuggestions, {
    props: { messages, ...props },
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

describe('KaloAiSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brandGrowthAPI.chatReply.mockResolvedValue({
      data: { reply: 'Dạ em lên đơn rồi ạ', guardrail_triggered: false },
    });
  });

  it('requests a suggestion with the last incoming message and up to 6 history items', async () => {
    const history = Array.from({ length: 8 }, (_, i) =>
      i % 2 ? outgoing(`bot ${i}`) : incoming(`khach ${i}`)
    );
    const wrapper = mountIt([
      ...history,
      msg(2, 'activity'),
      outgoing('note', { private: true }),
      incoming('Chị lấy 2 cái nhé'),
    ]);
    await flushPromises();
    const payload = brandGrowthAPI.chatReply.mock.calls[0][0];
    expect(payload.message).toBe('Chị lấy 2 cái nhé');
    expect(payload.history).toHaveLength(6);
    expect(payload.history.at(-1)).toEqual({
      role: 'assistant',
      content: 'bot 7',
    });
    expect(payload.history[0]).toEqual({ role: 'user', content: 'khach 2' });
    expect(wrapper.text()).toContain('Dạ em lên đơn rồi ạ');
  });

  it('shows nothing and no error toast when the API returns 503 ai_not_configured', async () => {
    brandGrowthAPI.chatReply.mockRejectedValue({
      response: { status: 503, data: { error: 'ai_not_configured' } },
    });
    const wrapper = mountIt([incoming('Alo')]);
    await flushPromises();
    expect(wrapper.find('[data-test="ai-suggestions"]').exists()).toBe(false);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('shows nothing and no error toast when the subscription expired (403)', async () => {
    brandGrowthAPI.chatReply.mockRejectedValue({
      response: { status: 403, data: { error: 'subscription_expired' } },
    });
    const wrapper = mountIt([incoming('Alo')]);
    await flushPromises();
    expect(wrapper.find('[data-test="ai-suggestions"]').exists()).toBe(false);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('clicking a suggestion fills the composer without sending', async () => {
    const wrapper = mountIt([incoming('Alo')]);
    await flushPromises();
    await wrapper.find('[data-test="ai-suggestion"]').trigger('click');
    expect(wrapper.emitted('select')).toEqual([['Dạ em lên đơn rồi ạ']]);
    expect(wrapper.emitted('send')).toBeUndefined();
  });

  it('ignores a stale response when a newer message arrived', async () => {
    const resolvers = [];
    brandGrowthAPI.chatReply.mockImplementation(
      () =>
        new Promise(r => {
          resolvers.push(r);
        })
    );
    const first = incoming('một');
    const wrapper = mountIt([first]);
    await wrapper.setProps({ messages: [first, incoming('hai')] });
    expect(resolvers).toHaveLength(2);
    resolvers[1]({ data: { reply: 'trả lời hai' } });
    await flushPromises();
    resolvers[0]({ data: { reply: 'trả lời một' } });
    await flushPromises();
    expect(wrapper.text()).toContain('trả lời hai');
    expect(wrapper.text()).not.toContain('trả lời một');
  });

  it('requests only once per incoming message, not on every update', async () => {
    const messages = [incoming('Alo')];
    const wrapper = mountIt(messages);
    await flushPromises();
    await wrapper.setProps({ messages: [...messages] });
    await wrapper.setProps({ isPrivate: false });
    expect(brandGrowthAPI.chatReply).toHaveBeenCalledTimes(1);
  });

  it('hides for private notes and when the last message is not incoming', async () => {
    const priv = mountIt([incoming('Alo')], { isPrivate: true });
    await flushPromises();
    expect(brandGrowthAPI.chatReply).not.toHaveBeenCalled();
    expect(priv.find('[data-test="ai-suggestions"]').exists()).toBe(false);

    const answered = mountIt([incoming('Alo'), outgoing('Dạ')]);
    await flushPromises();
    expect(brandGrowthAPI.chatReply).not.toHaveBeenCalled();
    expect(answered.find('[data-test="ai-suggestions"]').exists()).toBe(false);
  });

  it('hides the strip once the agent replies', async () => {
    const first = incoming('Alo');
    const wrapper = mountIt([first]);
    await flushPromises();
    expect(wrapper.find('[data-test="ai-suggestions"]').exists()).toBe(true);
    await wrapper.setProps({ messages: [first, outgoing('Dạ')] });
    expect(wrapper.find('[data-test="ai-suggestions"]').exists()).toBe(false);
  });
});
