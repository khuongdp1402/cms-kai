import reportsAPI from '../reports';
import ApiClient from '../../ApiClient';

describe('#KchatReportsAPI', () => {
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
    expect(reportsAPI).toBeInstanceOf(ApiClient);
    expect(reportsAPI).toHaveProperty('summary');
  });

  it('requests the summary for a range', () => {
    reportsAPI.summary('7d');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/kchat\/reports\/summary$/
      ),
      { params: { range: '7d' } }
    );
  });
});
