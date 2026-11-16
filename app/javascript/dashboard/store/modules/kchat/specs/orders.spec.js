import { createStore } from 'vuex';
import orders from '../orders';
import OrdersAPI from '../../../../api/kchat/orders';

vi.mock('../../../../api/kchat/orders', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(),
    transition: vi.fn(),
    sendQr: vi.fn(),
    show: vi.fn(),
  },
}));

const makeStore = () => createStore({ modules: { kchatOrders: orders } });
const order = (id, status) => ({ id, number: 1000 + id, status, items: [] });

describe('kchatOrders store', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetch passes status and query', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: { payload: [order(1, 'paid')], meta: { count: 1 } },
    });
    const store = makeStore();
    await store.dispatch('kchatOrders/fetch', {
      status: 'paid',
      query: 'Hà',
      page: 2,
    });
    expect(OrdersAPI.get).toHaveBeenCalledWith({
      status: 'paid',
      query: 'Hà',
      page: 2,
    });
    expect(store.getters['kchatOrders/getOrders']).toHaveLength(1);
    expect(store.getters['kchatOrders/getMeta']).toEqual({ count: 1 });
    expect(store.getters['kchatOrders/getUIFlags'].isFetching).toBe(false);
  });

  it('transition updates the order in place', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: {
        payload: [order(1, 'pending_payment'), order(2, 'paid')],
        meta: {},
      },
    });
    OrdersAPI.transition.mockResolvedValue({ data: order(1, 'paid') });
    const store = makeStore();
    await store.dispatch('kchatOrders/fetch', {});
    await store.dispatch('kchatOrders/transition', {
      id: 1,
      event: 'mark_paid',
    });
    expect(OrdersAPI.transition).toHaveBeenCalledWith(1, 'mark_paid');
    const list = store.getters['kchatOrders/getOrders'];
    expect(list.map(o => o.id)).toEqual([1, 2]);
    expect(store.getters['kchatOrders/getOrderById'](1).status).toBe('paid');
  });

  it('create puts the new order first and returns it', async () => {
    OrdersAPI.create.mockResolvedValue({ data: order(3, 'paid') });
    const store = makeStore();
    const created = await store.dispatch('kchatOrders/create', {
      source: 'pos',
    });
    expect(created.id).toBe(3);
    expect(store.getters['kchatOrders/getOrders'][0].id).toBe(3);
  });

  it('sendQr calls the API with the conversation display id', async () => {
    OrdersAPI.sendQr.mockResolvedValue({ data: { id: 99 } });
    const store = makeStore();
    await store.dispatch('kchatOrders/sendQr', { id: 1, conversationId: 12 });
    expect(OrdersAPI.sendQr).toHaveBeenCalledWith(1, 12);
  });

  it('rethrows API errors and resets the creating flag', async () => {
    const error = { response: { data: { error: 'insufficient_stock' } } };
    OrdersAPI.create.mockRejectedValue(error);
    const store = makeStore();
    await expect(store.dispatch('kchatOrders/create', {})).rejects.toBe(error);
    expect(store.getters['kchatOrders/getUIFlags'].isCreating).toBe(false);
  });

  it('commits only the latest fetch when an older one resolves last', async () => {
    let resolveOld;
    OrdersAPI.get
      .mockReturnValueOnce(
        new Promise(r => {
          resolveOld = r;
        })
      )
      .mockResolvedValueOnce({
        data: { payload: [order(2, 'paid')], meta: { count: 1 } },
      });
    const store = makeStore();
    const first = store.dispatch('kchatOrders/fetch', { query: 'a' });
    await store.dispatch('kchatOrders/fetch', { query: 'ab' });
    resolveOld({ data: { payload: [order(1, 'paid')], meta: { count: 1 } } });
    await first;
    expect(store.getters['kchatOrders/getOrders'].map(o => o.id)).toEqual([2]);
    expect(store.getters['kchatOrders/getUIFlags'].isFetching).toBe(false);
  });

  it('appends when page > 1 and replaces on page 1', async () => {
    OrdersAPI.get
      .mockResolvedValueOnce({
        data: { payload: [order(1, 'paid')], meta: { current_page: 1 } },
      })
      .mockResolvedValueOnce({
        data: { payload: [order(2, 'paid')], meta: { current_page: 2 } },
      })
      .mockResolvedValueOnce({
        data: { payload: [order(3, 'paid')], meta: { current_page: 1 } },
      });
    const store = makeStore();
    await store.dispatch('kchatOrders/fetch', { page: 1 });
    await store.dispatch('kchatOrders/fetch', { page: 2 });
    expect(store.getters['kchatOrders/getOrders'].map(o => o.id)).toEqual([
      1, 2,
    ]);
    expect(store.getters['kchatOrders/getMeta'].current_page).toBe(2);
    await store.dispatch('kchatOrders/fetch', { page: 1 });
    expect(store.getters['kchatOrders/getOrders'].map(o => o.id)).toEqual([3]);
  });

  it('fetchOne of an unknown order does not touch the paginated list', async () => {
    OrdersAPI.show.mockResolvedValue({ data: order(99, 'paid') });
    const store = makeStore();
    store.commit('kchatOrders/KCHAT_ORDERS_SET', {
      payload: [order(2, 'paid'), order(1, 'paid')],
      meta: { count: 2 },
    });
    await store.dispatch('kchatOrders/fetchOne', 99);
    expect(store.getters['kchatOrders/getOrders'].map(o => o.id)).toEqual([
      2, 1,
    ]);
    expect(store.getters['kchatOrders/getOrderById'](99).number).toBe(1099);
  });

  it('transition keeps an order fetched by id up to date', async () => {
    OrdersAPI.show.mockResolvedValue({ data: order(99, 'pending_payment') });
    OrdersAPI.transition.mockResolvedValue({ data: order(99, 'paid') });
    const store = makeStore();
    await store.dispatch('kchatOrders/fetchOne', 99);
    await store.dispatch('kchatOrders/transition', {
      id: 99,
      event: 'mark_paid',
    });
    expect(store.getters['kchatOrders/getOrderById'](99).status).toBe('paid');
    expect(store.getters['kchatOrders/getOrders']).toHaveLength(0);
  });
});
