import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import assistantAPI from 'dashboard/api/kchat/assistant';
import {
  buildHistory,
  errorKey,
  resetAssistantState,
  useKaloAssistant,
} from '../useKaloAssistant';
import { createAssistantEnv, apiError } from './assistantTestEnv';

vi.mock('dashboard/api/kchat/assistant', () => ({
  default: { send: vi.fn() },
}));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { aiHealth: vi.fn() },
}));

const setup = () => {
  let api;
  mount(
    defineComponent({
      setup() {
        api = useKaloAssistant();
        return () => h('div');
      },
    }),
    { global: { plugins: createAssistantEnv().plugins } }
  );
  return api;
};

beforeEach(() => {
  resetAssistantState();
  vi.clearAllMocks();
});

describe('buildHistory', () => {
  it('keeps only the last 6 turns, with role and content only', () => {
    const messages = Array.from({ length: 9 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      content: `m${i}`,
      extra: true,
    }));
    const history = buildHistory(messages);
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual({ role: 'assistant', content: 'm3' });
    expect(history.at(-1)).toEqual({ role: 'user', content: 'm8' });
  });
});

describe('errorKey', () => {
  it.each([
    [apiError(403, 'subscription_expired'), 'EXPIRED'],
    [apiError(429, 'rate_limited'), 'RATE_LIMITED'],
    [apiError(422, 'message_too_long'), 'TOO_LONG'],
    [apiError(422, 'prompt_too_large'), 'CONTEXT_TOO_LONG'],
    [apiError(502, 'ai_unavailable'), 'UNAVAILABLE'],
    [apiError(503, 'ai_not_configured'), 'UNAVAILABLE'],
    [apiError(500), 'GENERIC'],
    [new Error('network'), 'GENERIC'],
  ])('maps %j to %s', (error, key) => {
    expect(errorKey(error)).toBe(key);
  });
});

describe('useKaloAssistant', () => {
  it('sends mode and prior history, then appends the reply', async () => {
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Xin chào' } });
    const api = setup();
    api.setMode('write');
    expect(await api.send('  Viết bài  ')).toBe(true);
    expect(assistantAPI.send).toHaveBeenCalledWith({
      message: 'Viết bài',
      mode: 'write',
      history: [],
    });
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Ok' } });
    await api.send('Tiếp');
    expect(assistantAPI.send.mock.calls[1][0].history).toEqual([
      { role: 'user', content: 'Viết bài' },
      { role: 'assistant', content: 'Xin chào' },
    ]);
    expect(api.messages.value.map(m => m.content)).toEqual([
      'Viết bài',
      'Xin chào',
      'Tiếp',
      'Ok',
    ]);
  });

  it('removes the user turn and exposes the error key on failure', async () => {
    assistantAPI.send.mockRejectedValue(apiError(429, 'rate_limited'));
    const api = setup();
    expect(await api.send('Hỏi')).toBe(false);
    expect(api.messages.value).toEqual([]);
    expect(api.error.value).toBe('RATE_LIMITED');
    assistantAPI.send.mockResolvedValue({ data: { reply: 'Ok' } });
    await api.send('Hỏi lại');
    expect(api.error.value).toBeNull();
  });

  it('ignores blank input and unknown modes', async () => {
    const api = setup();
    expect(await api.send('   ')).toBe(false);
    api.setMode('hack');
    expect(api.mode.value).toBe('help');
    expect(assistantAPI.send).not.toHaveBeenCalled();
  });

  it('shares the session between components of the same account', async () => {
    assistantAPI.send.mockResolvedValue({ data: { reply: 'A' } });
    const first = setup();
    await first.send('Q');
    expect(setup().messages.value).toHaveLength(2);
  });
});
