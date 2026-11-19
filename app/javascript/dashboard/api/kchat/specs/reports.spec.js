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

  it('requests the summary, funnel and brands overview for a range', () => {
    reportsAPI.summary('7d');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1(\/accounts\/\d+)?\/kchat\/reports\/summary$/
      ),
      { params: { range: '7d' } }
    );

    reportsAPI.funnel('month');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/reports\/funnel$/),
      { params: { range: 'month' } }
    );

    reportsAPI.brandsOverview('today');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/reports\/brands_overview$/),
      { params: { range: 'today' } }
    );

    reportsAPI.qualityOverview('7d');
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/reports\/quality_overview$/),
      { params: { range: '7d' } }
    );
  });
});
