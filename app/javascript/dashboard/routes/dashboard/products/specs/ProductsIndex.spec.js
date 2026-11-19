import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import { routeLocationKey } from 'vue-router';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { kaloFeatureGetters } from 'dashboard/helper/specs/kaloFeatureGetters';
import { useAlert } from 'dashboard/composables';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';
import { makeProduct } from '../../orders/specs/kaloOrdersFixtures';
import ProductsIndex from '../ProductsIndex.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const mountIndex = (
  products,
  { role = 'administrator', route, actions = {}, features } = {}
) => {
  const list = ref(products);
  const spies = {
    fetch: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 99 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    archive: vi.fn().mockResolvedValue({ deleted: false }),
    adjustStock: vi.fn().mockResolvedValue({ id: 1, stock: 12 }),
    ...actions,
  };
  const store = createStore({
    getters: { ...kaloFeatureGetters(features), getCurrentRole: () => role },
    modules: {
      kchatProducts: {
        namespaced: true,
        getters: {
          getProducts: () => list.value,
          getUIFlags: () => ({ isFetching: false }),
        },
        actions: Object.fromEntries(
          Object.entries(spies).map(([name, spy]) => [
            name,
            (_ctx, payload) => spy(payload),
          ])
        ),
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(ProductsIndex, {
    global: {
      plugins: [store, i18n],
      provide: route ? { [routeLocationKey]: route } : {},
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  });
  return { wrapper, spies, list };
};

describe('ProductsIndex', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists products with VND price, stock and status, loading active ones first', async () => {
    const { wrapper, spies } = mountIndex([
      makeProduct({ id: 1, price: 150000, stock: 5, sku: 'AT1' }),
      makeProduct({ id: 2, name: 'Dịch vụ gói quà', stock: null }),
      makeProduct({ id: 3, name: 'Nến thơm', stock: 0 }),
    ]);
    await flushPromises();
    expect(spies.fetch).toHaveBeenCalledWith({
      query: undefined,
      active: true,
    });
    const rows = wrapper.findAll('[data-test="product-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0].find('[data-test="product-price"]').text()).toBe('150.000đ');
    expect(rows[0].text()).toContain('Mã: AT1');
    expect(rows[0].find('[data-test="product-stock"]').text()).toBe('Còn 5');
    expect(rows[1].find('[data-test="product-stock"]').text()).toBe(
      'Không theo dõi'
    );
    expect(rows[2].find('[data-test="product-stock"]').text()).toBe('Hết hàng');
    expect(rows[0].find('[data-test="product-status"]').text()).toBe(
      'Đang bán'
    );
  });

  it('searches (debounced) and filters archived products', async () => {
    vi.useFakeTimers();
    const { wrapper, spies } = mountIndex([makeProduct()]);
    await flushPromises();
    await wrapper.find('[data-test="products-search"]').setValue('áo');
    vi.advanceTimersByTime(300);
    expect(spies.fetch).toHaveBeenLastCalledWith({ query: 'áo', active: true });
    await wrapper
      .find('[data-test="products-filter-archived"]')
      .trigger('click');
    expect(spies.fetch).toHaveBeenLastCalledWith({
      query: 'áo',
      active: false,
    });
    await wrapper.find('[data-test="products-filter-all"]').trigger('click');
    expect(spies.fetch).toHaveBeenLastCalledWith({
      query: 'áo',
      active: undefined,
    });
    vi.useRealTimers();
  });

  it('empty state has one sentence and one create button that opens the drawer', async () => {
    const { wrapper } = mountIndex([]);
    await flushPromises();
    const empty = wrapper.find('[data-test="products-empty"]');
    expect(empty.findAll('p')).toHaveLength(1);
    expect(empty.findAll('button')).toHaveLength(1);
    expect(wrapper.find('[data-test="products-create"]').exists()).toBe(false);
    await empty.find('button').trigger('click');
    expect(wrapper.find('[data-test="product-drawer"]').exists()).toBe(true);
  });

  it('shows "no results" instead of the empty state while searching', async () => {
    const { wrapper } = mountIndex([]);
    await flushPromises();
    await wrapper
      .find('[data-test="products-filter-archived"]')
      .trigger('click');
    expect(wrapper.find('[data-test="products-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="products-no-results"]').text()).toBe(
      'Không tìm thấy sản phẩm phù hợp.'
    );
  });

  it('validates the form in Vietnamese and creates with a VND price', async () => {
    const { wrapper, spies } = mountIndex([makeProduct()]);
    await flushPromises();
    await wrapper.find('[data-test="products-create"]').trigger('click');
    const drawer = () => wrapper.find('[data-test="product-drawer"]');
    expect(drawer().find('label').text()).toContain('Tên sản phẩm');

    await drawer().find('[data-test="product-form-price"]').setValue('abc');
    await drawer().find('[data-test="product-form-stock"]').setValue('-1');
    await drawer().find('form').trigger('submit');
    expect(spies.create).not.toHaveBeenCalled();
    expect(drawer().find('[data-test="product-form-error-name"]').text()).toBe(
      'Nhập tên sản phẩm.'
    );
    expect(drawer().find('[data-test="product-form-error-price"]').text()).toBe(
      'Giá phải là số nguyên từ 0 trở lên, ví dụ 150000.'
    );
    expect(drawer().find('[data-test="product-form-error-stock"]').text()).toBe(
      'Tồn kho phải là số nguyên từ 0 trở lên.'
    );

    await drawer().find('[data-test="product-form-name"]').setValue(' Mũ len ');
    await drawer().find('[data-test="product-form-price"]').setValue('150.000');
    await drawer().find('[data-test="product-form-stock"]').setValue('');
    expect(
      drawer().find('[data-test="product-form-price-preview"]').text()
    ).toBe('Khách thấy: 150.000đ');
    await drawer().find('form').trigger('submit');
    await flushPromises();
    expect(spies.create).toHaveBeenCalledWith({
      name: 'Mũ len',
      sku: null,
      price: 150000,
      stock: null,
    });
    expect(useAlert).toHaveBeenCalledWith('Đã thêm sản phẩm');
    expect(wrapper.find('[data-test="product-drawer"]').exists()).toBe(false);
  });

  it('edits a product prefilled from the row', async () => {
    const { wrapper, spies } = mountIndex([
      makeProduct({ id: 7, name: 'Cốc', price: 50000, stock: 2, sku: 'C1' }),
    ]);
    await flushPromises();
    await wrapper.find('[data-test="product-edit"]').trigger('click');
    const drawer = wrapper.find('[data-test="product-drawer"]');
    expect(drawer.text()).toContain('Sửa sản phẩm');
    expect(drawer.find('[data-test="product-form-name"]').element.value).toBe(
      'Cốc'
    );
    await drawer.find('[data-test="product-form-price"]').setValue('55000');
    await drawer.find('form').trigger('submit');
    await flushPromises();
    expect(spies.update).toHaveBeenCalledWith({
      id: 7,
      name: 'Cốc',
      sku: 'C1',
      price: 55000,
      stock: 2,
    });
  });

  it('sends an image as FormData and rejects a non image file', async () => {
    const { wrapper, spies } = mountIndex([makeProduct()]);
    await flushPromises();
    await wrapper.find('[data-test="products-create"]').trigger('click');
    const drawer = wrapper.find('[data-test="product-drawer"]');
    await drawer.find('[data-test="product-form-name"]').setValue('Nến');
    await drawer.find('[data-test="product-form-price"]').setValue('1000');
    const input = drawer.find('[data-test="product-form-image"]');

    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    Object.defineProperty(input.element, 'files', {
      value: [pdf],
      configurable: true,
    });
    await input.trigger('change');
    await drawer.find('form').trigger('submit');
    expect(spies.create).not.toHaveBeenCalled();
    expect(drawer.find('[data-test="product-form-error-image"]').text()).toBe(
      'Chỉ nhận ảnh PNG, JPG, GIF hoặc WEBP.'
    );

    const png = new File(['x'], 'a.png', { type: 'image/png' });
    Object.defineProperty(input.element, 'files', {
      value: [png],
      configurable: true,
    });
    await input.trigger('change');
    await drawer.find('form').trigger('submit');
    await flushPromises();
    const sent = spies.create.mock.calls[0][0];
    expect(sent).toBeInstanceOf(FormData);
    expect(sent.get('name')).toBe('Nến');
    expect(sent.get('price')).toBe('1000');
    expect(sent.get('image')).toBe(png);
  });

  it('archives after confirming in a center dialog', async () => {
    const { wrapper, spies } = mountIndex([
      makeProduct({ id: 4, name: 'Áo cũ' }),
    ]);
    await flushPromises();
    await wrapper.find('[data-test="product-archive"]').trigger('click');
    const dialog = wrapper.find('[data-test="archive-dialog"]');
    expect(dialog.attributes('role')).toBe('alertdialog');
    expect(dialog.text()).toContain('“Áo cũ” sẽ không còn hiện');
    await wrapper.find('[data-test="archive-cancel"]').trigger('click');
    expect(spies.archive).not.toHaveBeenCalled();

    await wrapper.find('[data-test="product-archive"]').trigger('click');
    await wrapper.find('[data-test="archive-confirm"]').trigger('click');
    await flushPromises();
    expect(spies.archive).toHaveBeenCalledWith(4);
    expect(useAlert).toHaveBeenCalledWith('Đã lưu trữ sản phẩm');
  });

  it('says "deleted" when the product had no orders', async () => {
    const { wrapper } = mountIndex([makeProduct()], {
      actions: { archive: vi.fn().mockResolvedValue({ deleted: true }) },
    });
    await flushPromises();
    await wrapper.find('[data-test="product-archive"]').trigger('click');
    await wrapper.find('[data-test="archive-confirm"]').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Đã xóa sản phẩm');
  });

  it('restores an archived product', async () => {
    const { wrapper, spies } = mountIndex([
      makeProduct({ id: 5, active: false }),
    ]);
    await flushPromises();
    expect(wrapper.find('[data-test="product-status"]').text()).toBe(
      'Đã lưu trữ'
    );
    await wrapper.find('[data-test="product-restore"]').trigger('click');
    await flushPromises();
    expect(spies.update).toHaveBeenCalledWith({ id: 5, active: true });
  });

  it('adjusts stock by a relative amount and refuses going below zero', async () => {
    const { wrapper, spies } = mountIndex([makeProduct({ id: 6, stock: 3 })]);
    await flushPromises();
    await wrapper.find('[data-test="product-adjust"]').trigger('click');
    const drawer = wrapper.find('[data-test="stock-drawer"]');
    expect(drawer.text()).toContain('Tồn kho hiện tại: 3');

    await drawer.find('[data-test="stock-delta"]').setValue('-4');
    await drawer.find('form').trigger('submit');
    expect(spies.adjustStock).not.toHaveBeenCalled();
    expect(drawer.find('[data-test="stock-error"]').text()).toBe(
      'Không thể trừ quá số đang có.'
    );

    await drawer.find('[data-test="stock-delta"]').setValue('99999999999');
    await drawer.find('form').trigger('submit');
    expect(spies.adjustStock).not.toHaveBeenCalled();
    expect(drawer.find('[data-test="stock-error"]').text()).toBe(
      'Nhập số nguyên khác 0, không quá 1.000.000.000.'
    );

    await drawer.find('[data-test="stock-delta"]').setValue('+9');
    expect(drawer.find('[data-test="stock-result"]').text()).toBe(
      'Sau khi đổi: 12'
    );
    await drawer.find('form').trigger('submit');
    await flushPromises();
    expect(spies.adjustStock).toHaveBeenCalledWith({ id: 6, delta: 9 });
    expect(useAlert).toHaveBeenCalledWith('Đã cập nhật tồn kho');
  });

  it('opens the create drawer from ?new=1 (setup checklist link)', async () => {
    const { wrapper } = mountIndex([makeProduct()], {
      route: { query: { new: '1' } },
    });
    await flushPromises();
    expect(wrapper.find('[data-test="product-drawer"]').exists()).toBe(true);
  });

  it('agents see the list read-only', async () => {
    const { wrapper } = mountIndex([makeProduct()], {
      role: 'agent',
      route: { query: { new: '1' } },
    });
    await flushPromises();
    expect(wrapper.find('[data-test="products-read-only"]').exists()).toBe(
      true
    );
    expect(wrapper.find('[data-test="products-create"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="product-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="product-archive"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="product-drawer"]').exists()).toBe(false);
  });

  it('links to POS only when the POS module is on', async () => {
    const on = mountIndex([makeProduct()]);
    await flushPromises();
    expect(on.wrapper.find('[data-test="products-open-pos"]').exists()).toBe(
      true
    );
    const off = mountIndex([makeProduct()], { features: { kalo_brand: true } });
    await flushPromises();
    expect(off.wrapper.find('[data-test="products-open-pos"]').exists()).toBe(
      false
    );
  });

  it('renders every target of the products tour', async () => {
    const { wrapper } = mountIndex([makeProduct()]);
    await flushPromises();
    expectTourTargets(wrapper, 'products');
  });
});
