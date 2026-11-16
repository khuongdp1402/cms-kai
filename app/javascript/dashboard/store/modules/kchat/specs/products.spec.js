import { createStore } from 'vuex';
import products from '../products';
import ProductsAPI from '../../../../api/kchat/products';

vi.mock('../../../../api/kchat/products', () => ({
  default: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
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
});
