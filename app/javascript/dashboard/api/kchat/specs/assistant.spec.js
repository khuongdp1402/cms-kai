import assistantAPI from '../assistant';
import brandGrowthAPI from '../brandGrowth';
import ApiClient from '../../ApiClient';

describe('#KchatAssistantAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    post: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('creates correct instance', () => {
    expect(assistantAPI).toBeInstanceOf(ApiClient);
    expect(assistantAPI).toHaveProperty('send');
  });

  it('posts message, mode and history to kchat/assistant', () => {
    const history = [{ role: 'user', content: 'Chào' }];
    assistantAPI.send({ message: 'Hỏi', mode: 'write', history });
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1(\/accounts\/\d+)?\/kchat\/assistant$/),
      { message: 'Hỏi', mode: 'write', history }
    );
  });

  it('reads AI availability from brand_growth/ai_health', () => {
    brandGrowthAPI.aiHealth();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/brand_growth\/ai_health$/)
    );
  });
});
