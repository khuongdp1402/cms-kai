import brandGrowthAPI from '../brandGrowth';
import ApiClient from '../../ApiClient';

describe('#KchatBrandGrowthAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = { post: vi.fn(() => Promise.resolve()) };

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('creates correct instance', () => {
    expect(brandGrowthAPI).toBeInstanceOf(ApiClient);
    expect(brandGrowthAPI).toHaveProperty('chatReply');
  });

  it('posts the message and history to chat_reply', () => {
    const history = [{ role: 'user', content: 'Chào shop' }];
    brandGrowthAPI.chatReply({ message: 'Còn hàng không?', history });
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/brand_growth\/chat_reply$/
      ),
      { message: 'Còn hàng không?', history }
    );
  });
});
