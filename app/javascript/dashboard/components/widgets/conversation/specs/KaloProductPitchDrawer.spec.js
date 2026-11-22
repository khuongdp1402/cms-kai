import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloProductPitchDrawer from '../KaloProductPitchDrawer.vue';

const PRODUCTS = [
  {
    id: 1,
    name: 'Phòng Deluxe 2N1Đ',
    category: 'Khách sạn',
    availability_mode: 'preorder',
    price: 2400000,
    description: 'Ăn sáng buffet',
    formatted_pitch: '• Phòng Deluxe 2N1Đ — 2.400.000đ\nĂn sáng buffet',
    image_url: 'https://example.com/room.jpg',
    active: true,
  },
  {
    id: 2,
    name: 'Tour Đà Lạt 3N2Đ',
    category: 'Tour',
    availability_mode: 'preorder',
    price: 3290000,
    description: 'Xe Limousine',
    formatted_pitch: '• Tour Đà Lạt 3N2Đ — 3.290.000đ',
    image_url: null,
    active: true,
  },
];

const mountDrawer = (products = PRODUCTS) => {
  const fetch = vi.fn().mockResolvedValue(products);
  const store = createStore({
    modules: {
      kchatProducts: {
        namespaced: true,
        getters: { getProducts: () => products },
        actions: { fetch },
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(KaloProductPitchDrawer, {
    attachTo: document.body,
    global: { plugins: [store, i18n] },
  });
  return { wrapper, fetch };
};

describe('KaloProductPitchDrawer', () => {
  it('filters by category, selects multiple products, and emits insert/send/createOrder', async () => {
    const { wrapper, fetch } = mountDrawer();
    await flushPromises();
    expect(fetch).toHaveBeenCalledWith(expect.anything(), { active: true });

    const cats = wrapper.findAll('[data-test="pitch-cat-chip"]');
    expect(cats.map(c => c.text())).toEqual(['Khách sạn', 'Tour']);

    await cats[0].trigger('click');
    expect(wrapper.findAll('[data-test="pitch-item"]')).toHaveLength(1);

    await wrapper.find('[data-test="pitch-cat-all"]').trigger('click');
    const items = wrapper.findAll('[data-test="pitch-item"]');
    expect(items).toHaveLength(2);

    await items[0].trigger('click');
    await items[1].trigger('click');
    await flushPromises();

    const preview = wrapper.find('[data-test="pitch-preview"]').element.value;
    expect(preview).toContain('Phòng Deluxe 2N1Đ');
    expect(preview).toContain('https://example.com/room.jpg');
    expect(preview).toContain('Tour Đà Lạt 3N2Đ');

    await wrapper.find('[data-test="pitch-insert"]').trigger('click');
    expect(wrapper.emitted('insert')[0][0]).toContain('Phòng Deluxe 2N1Đ');

    await wrapper.find('[data-test="pitch-create-order"]').trigger('click');
    expect(wrapper.emitted('createOrder')[0][0]).toHaveLength(2);

    await wrapper.find('[data-test="pitch-send"]').trigger('click');
    expect(wrapper.emitted('send')[0][0]).toContain('Tour Đà Lạt 3N2Đ');
  });
});
