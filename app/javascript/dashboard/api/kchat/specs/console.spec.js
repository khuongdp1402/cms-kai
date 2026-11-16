import consoleAPI from '../console';
import ApiClient from '../../ApiClient';

describe('#consoleAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    get: vi.fn(() => Promise.resolve()),
    patch: vi.fn(() => Promise.resolve()),
    post: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    window.axios = axiosMock;
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.axios = originalAxios;
  });

  it('is an ApiClient on the console resource', () => {
    expect(consoleAPI).toBeInstanceOf(ApiClient);
    expect(consoleAPI.url).toBe('/api/v1/console');
  });

  it('loads the overview', () => {
    consoleAPI.overview();
    expect(axiosMock.get).toHaveBeenCalledWith('/api/v1/console/overview');
  });

  it('lists accounts with query, filter and page', () => {
    consoleAPI.accounts({ query: 'mây', filter: 'trial', page: 2 });
    expect(axiosMock.get).toHaveBeenCalledWith('/api/v1/console/accounts', {
      params: { query: 'mây', filter: 'trial', page: 2 },
    });
  });

  it('updates an account with locked or extend_days', () => {
    consoleAPI.updateAccount(7, { extend_days: 30 });
    expect(axiosMock.patch).toHaveBeenCalledWith('/api/v1/console/accounts/7', {
      extend_days: 30,
    });
  });

  it('lists payment events by status and page', () => {
    consoleAPI.paymentEvents({ status: 'unmatched', page: 1 });
    expect(axiosMock.get).toHaveBeenCalledWith(
      '/api/v1/console/payment_events',
      { params: { status: 'unmatched', page: 1 } }
    );
  });

  it('assigns a payment event to an account', () => {
    consoleAPI.assignPaymentEvent(4, 9);
    expect(axiosMock.post).toHaveBeenCalledWith(
      '/api/v1/console/payment_events/4/assign',
      { account_id: 9 }
    );
  });
});
