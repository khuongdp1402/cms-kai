import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import PosIndex from '../PosIndex.vue';
import { makeProduct } from '../../orders/specs/kaloOrdersFixtures';

const mountPos = (products, create = vi.fn().mockResolvedValue({})) => {
  const store = createStore({
    modules: {
      kchatProducts: {
        namespaced: true,
        getters: {
          getProducts: () => products,
          getUIFlags: () => ({ isFetching: false }),
        },
        actions: { fetch: vi.fn(), create },
      },
      kchatOrders: {
        namespaced: true,
        getters: { getUIFlags: () => ({ isCreating: false }) },
        actions: {},
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(PosIndex, {
    global: {
      plugins: [store, i18n],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  });
};

describe('PosIndex', () => {
  it('tapping a product adds it to the cart', async () => {
    const wrapper = mountPos([makeProduct()]);
    await flushPromises();
    await wrapper.find('[data-test="product-card"]').trigger('click');
    expect(wrapper.findAll('[data-test="cart-line"]')).toHaveLength(1);
  });

  it('without products shows one sentence and one button that opens the form', async () => {
    const create = vi.fn().mockResolvedValue({});
    const wrapper = mountPos([], create);
    await flushPromises();
    const empty = wrapper.find('[data-test="pos-empty"]');
    expect(empty.findAll('p')).toHaveLength(1);
    expect(empty.findAll('button')).toHaveLength(1);
    await empty.find('button').trigger('click');
    await wrapper.find('[data-test="product-name"]').setValue('Nến');
    await wrapper.find('[data-test="product-price"]').setValue('189000');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(create.mock.calls[0][1]).toEqual({ name: 'Nến', price: 189000 });
  });
});
