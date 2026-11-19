import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import PosIndex from '../PosIndex.vue';
import { routeLocationKey } from 'vue-router';
import { makeProduct } from '../../orders/specs/kaloOrdersFixtures';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

const mountPos = (
  products,
  create = vi.fn().mockResolvedValue({}),
  route = undefined,
  role = 'administrator'
) => {
  const store = createStore({
    getters: { getCurrentRole: () => role },
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
      provide: route ? { [routeLocationKey]: route } : {},
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

  const fillForm = async (wrapper, { price, stock = '' }) => {
    await wrapper.find('[data-test="pos-empty"] button').trigger('click');
    await wrapper.find('[data-test="product-name"]').setValue('Nến');
    await wrapper.find('[data-test="product-price"]').setValue(price);
    await wrapper.find('[data-test="product-stock"]').setValue(stock);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
  };

  it.each([
    ['1.5', ''],
    ['-1', ''],
    ['', ''],
    ['100', '1.5'],
    ['100', '-1'],
  ])('rejects price %s with stock %s', async (price, stock) => {
    const create = vi.fn().mockResolvedValue({});
    const wrapper = mountPos([], create);
    await flushPromises();
    await fillForm(wrapper, { price, stock });
    expect(create).not.toHaveBeenCalled();
    expect(
      wrapper.find('[data-test="product-save"]').attributes('disabled')
    ).toBeDefined();
  });

  it('accepts a price of 0 and sends stock only when filled', async () => {
    const create = vi.fn().mockResolvedValue({});
    const wrapper = mountPos([], create);
    await flushPromises();
    await fillForm(wrapper, { price: '0', stock: '0' });
    expect(create.mock.calls[0][1]).toEqual({
      name: 'Nến',
      price: 0,
      stock: 0,
    });
  });

  it('labels the search and the product form fields', async () => {
    const wrapper = mountPos([]);
    await flushPromises();
    expect(wrapper.find('input[type="search"]').attributes('aria-label')).toBe(
      'Tìm sản phẩm'
    );
    await wrapper.find('[data-test="pos-empty"] button').trigger('click');
    wrapper
      .findAll('form input')
      .forEach(input => expect(input.attributes('aria-label')).toBeTruthy());
  });

  it('allows opening the add-product modal from the header even when products already exist', async () => {
    const create = vi.fn().mockResolvedValue({});
    const wrapper = mountPos([makeProduct()], create);
    await flushPromises();

    await wrapper.find('[data-test="pos-open-product-modal"]').trigger('click');
    const modal = wrapper.find('[data-test="pos-product-modal"]');
    expect(modal.exists()).toBe(true);

    await modal.find('[data-test="product-name"]').setValue('Tinh dầu quế');
    await modal.find('[data-test="product-price"]').setValue('120000');
    await modal.find('form').trigger('submit');
    await flushPromises();

    expect(create.mock.calls[0][1]).toEqual({
      name: 'Tinh dầu quế',
      price: 120000,
    });
    expect(wrapper.find('[data-test="pos-product-modal"]').exists()).toBe(
      false
    );
  });

  it('renders every target of the POS tour', async () => {
    const wrapper = mountPos([makeProduct()]);
    await flushPromises();
    expectTourTargets(wrapper, 'pos');
  });

  it('opens the add-product form from ?add_product=1 (setup checklist link)', async () => {
    const wrapper = mountPos([makeProduct()], undefined, {
      query: { add_product: '1' },
    });
    await flushPromises();
    expect(wrapper.find('[data-test="pos-product-modal"]').exists()).toBe(true);
  });

  it('shows stock on tiles that track it', async () => {
    const wrapper = mountPos([
      makeProduct({ id: 1, stock: 4 }),
      makeProduct({ id: 2, stock: 0 }),
      makeProduct({ id: 3, stock: null }),
    ]);
    await flushPromises();
    const stocks = wrapper
      .findAll('[data-test="product-card"]')
      .map(card => card.find('[data-test="product-card-stock"]'));
    expect(stocks[0].text()).toBe('Còn 4');
    expect(stocks[1].text()).toBe('Hết hàng');
    expect(stocks[2].exists()).toBe(false);
  });

  it('links administrators to the products page', async () => {
    const wrapper = mountPos([makeProduct()]);
    await flushPromises();
    expect(wrapper.find('[data-test="pos-manage-products"]').text()).toBe(
      'Quản lý sản phẩm'
    );
  });

  it('agents sell existing products but cannot add or manage them', async () => {
    const agentPos = mountPos([makeProduct()], undefined, undefined, 'agent');
    await flushPromises();
    expect(agentPos.find('[data-test="pos-open-product-modal"]').exists()).toBe(
      false
    );
    expect(agentPos.find('[data-test="pos-manage-products"]').exists()).toBe(
      false
    );

    const emptyPos = mountPos([], undefined, undefined, 'agent');
    await flushPromises();
    expect(emptyPos.find('[data-test="pos-empty"] button').exists()).toBe(
      false
    );
    expect(emptyPos.find('[data-test="pos-empty"] form').exists()).toBe(false);
  });
});
