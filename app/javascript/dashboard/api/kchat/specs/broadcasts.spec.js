import broadcastsAPI from '../broadcasts';
import ApiClient from '../../ApiClient';

describe('#KchatBroadcastsAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    get: vi.fn(() => Promise.resolve()),
    post: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    window.axios = axiosMock;
  });

  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('calls list, preview and create endpoints', () => {
    expect(broadcastsAPI).toBeInstanceOf(ApiClient);

    broadcastsAPI.list();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts$/)
    );

    broadcastsAPI.preview({ inbox_id: 3, labels: 'vip' });
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/preview$/),
      { params: { inbox_id: 3, labels: 'vip' } }
    );

    broadcastsAPI.create({ title: 'Test', inbox_id: 3, message: 'Hi' });
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts$/),
      { title: 'Test', inbox_id: 3, message: 'Hi' }
    );
  });
});
