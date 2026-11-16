import { createStore } from 'vuex';
import orders from '../orders';
import OrdersAPI from '../../../../api/kchat/orders';

vi.mock('../../../../api/kchat/orders', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(),
    transition: vi.fn(),
    sendQr: vi.fn(),
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
});
