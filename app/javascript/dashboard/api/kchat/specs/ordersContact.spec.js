import ordersAPI from '../orders';

describe('#KchatOrdersAPI contact filter', () => {
  const originalAxios = window.axios;
  const axiosMock = { get: vi.fn(() => Promise.resolve()) };

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('passes contact_id and status to the list endpoint', () => {
    ordersAPI.get({ status: 'pending_payment', contactId: 7 });
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/kchat\/orders$/),
      {
        params: {
          status: 'pending_payment',
          query: undefined,
          page: undefined,
          contact_id: 7,
        },
      }
    );
  });

  it('passes the delivery filter', () => {
    ordersAPI.get({ status: 'paid', delivery: 'pending' });
    expect(axiosMock.get.mock.calls.at(-1)[1].params).toMatchObject({
      status: 'paid',
      delivery: 'pending',
    });
  });
});
