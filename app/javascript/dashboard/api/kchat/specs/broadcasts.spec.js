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

  it('calls the campaign wizard endpoints', () => {
    window.axios.patch = vi.fn(() => Promise.resolve());
    window.axios.delete = vi.fn(() => Promise.resolve());

    broadcastsAPI.results('b-1');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/b-1$/)
    );

    broadcastsAPI.audience({ labels: 'vip', segment_id: 4 });
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/audience$/),
      { params: { labels: 'vip', segment_id: 4 } }
    );

    broadcastsAPI.checkContent('Xin chào');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/check_content$/),
      { message: 'Xin chào' }
    );

    broadcastsAPI.updateDraft('b-1', { draft: false });
    expect(window.axios.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/b-1$/),
      { draft: false }
    );

    broadcastsAPI.destroyDraft('b-1');
    expect(window.axios.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/broadcasts\/b-1$/)
    );
  });
});
