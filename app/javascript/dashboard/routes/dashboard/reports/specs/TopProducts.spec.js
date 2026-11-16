import { mount } from '@vue/test-utils';
import TopProducts from '../TopProducts.vue';
import { createPageTestEnv } from './kaloPageTestEnv';

describe('TopProducts', () => {
  it('renders every row even when two products share a name', () => {
    const wrapper = mount(TopProducts, {
      props: {
        products: [
          { name: 'Nến', sold: 2, revenue: 100000, stock: 3 },
          { name: 'Nến', sold: 1, revenue: 50000, stock: null },
        ],
      },
      global: { plugins: createPageTestEnv().plugins },
    });
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });
});
