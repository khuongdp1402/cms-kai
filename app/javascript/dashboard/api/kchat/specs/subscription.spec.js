import subscriptionAPI from '../subscription';
import ApiClient from '../../ApiClient';

describe('#KchatSubscriptionAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = { get: vi.fn(() => Promise.resolve()) };

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('creates correct instance', () => {
    expect(subscriptionAPI).toBeInstanceOf(ApiClient);
  });

  it('fetches the subscription', () => {
    subscriptionAPI.get();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1(\/accounts\/\d+)?\/kchat\/subscription$/)
    );
  });
});
