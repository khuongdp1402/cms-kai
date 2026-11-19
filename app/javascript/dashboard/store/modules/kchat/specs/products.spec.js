import { createStore } from 'vuex';
import products from '../products';
import ProductsAPI from '../../../../api/kchat/products';

vi.mock('../../../../api/kchat/products', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjustStock: vi.fn(),
  },
}));

const makeStore = () => createStore({ modules: { kchatProducts: products } });

describe('kchatProducts store', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetch passes query and active', async () => {
    ProductsAPI.get.mockResolvedValue({
      data: { payload: [{ id: 1, name: 'Nến' }], meta: { count: 1 } },
    });
    const store = makeStore();
    await store.dispatch('kchatProducts/fetch', { query: 'nến', active: true });
    expect(ProductsAPI.get).toHaveBeenCalledWith({
      query: 'nến',
      active: true,
    });
    expect(store.getters['kchatProducts/getProducts']).toHaveLength(1);
  });

  it('create appends and update replaces in place', async () => {
    ProductsAPI.create.mockResolvedValue({ data: { id: 5, name: 'Cốc' } });
    ProductsAPI.update.mockResolvedValue({
      data: { id: 5, name: 'Cốc lam' },
    });
    const store = makeStore();
    await store.dispatch('kchatProducts/create', { name: 'Cốc', price: 1 });
    await store.dispatch('kchatProducts/update', { id: 5, name: 'Cốc lam' });
    expect(ProductsAPI.update).toHaveBeenCalledWith(5, { name: 'Cốc lam' });
    expect(store.getters['kchatProducts/getProducts']).toEqual([
      { id: 5, name: 'Cốc lam' },
    ]);
  });

  it('commits only the latest fetch when an older one resolves last', async () => {
    let resolveOld;
    ProductsAPI.get
      .mockReturnValueOnce(
        new Promise(r => {
          resolveOld = r;
        })
      )
      .mockResolvedValueOnce({
        data: { payload: [{ id: 2, name: 'Cốc' }], meta: { count: 1 } },
      });
    const store = makeStore();
    const first = store.dispatch('kchatProducts/fetch', { query: 'n' });
    await store.dispatch('kchatProducts/fetch', { query: 'c' });
    resolveOld({
      data: { payload: [{ id: 1, name: 'Nến' }], meta: { count: 1 } },
    });
    await first;
    expect(store.getters['kchatProducts/getProducts'].map(p => p.id)).toEqual([
      2,
    ]);
    expect(store.getters['kchatProducts/getUIFlags'].isFetching).toBe(false);
  });

  it('archive removes a deleted product and keeps an archived one inactive', async () => {
    ProductsAPI.get.mockResolvedValue({
      data: {
        payload: [
          { id: 1, name: 'Nến', active: true },
          { id: 2, name: 'Cốc', active: true },
        ],
        meta: { count: 2 },
      },
    });
    ProductsAPI.delete
      .mockResolvedValueOnce({ status: 204, data: '' })
      .mockResolvedValueOnce({
        status: 200,
        data: { id: 2, name: 'Cốc', active: false },
      });
    const store = makeStore();
    await store.dispatch('kchatProducts/fetch');
    expect(await store.dispatch('kchatProducts/archive', 1)).toEqual({
      deleted: true,
    });
    expect(await store.dispatch('kchatProducts/archive', 2)).toEqual({
      deleted: false,
    });
    expect(store.getters['kchatProducts/getProducts']).toEqual([
      { id: 2, name: 'Cốc', active: false },
    ]);
  });

  it('adjustStock sends the delta and stores the new stock', async () => {
    ProductsAPI.adjustStock.mockResolvedValue({
      data: { id: 3, name: 'Áo', stock: 7 },
    });
    const store = makeStore();
    await store.dispatch('kchatProducts/adjustStock', { id: 3, delta: 2 });
    expect(ProductsAPI.adjustStock).toHaveBeenCalledWith(3, 2);
    expect(store.getters['kchatProducts/getProducts']).toEqual([
      { id: 3, name: 'Áo', stock: 7 },
    ]);
  });
});
