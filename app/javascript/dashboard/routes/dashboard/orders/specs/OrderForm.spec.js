import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrderForm from '../OrderForm.vue';
import { makeOrder, makeProduct } from './kaloOrdersFixtures';

const mountForm = (props = {}, create = vi.fn()) => {
  const store = createStore({
    modules: {
      kchatOrders: {
        namespaced: true,
        getters: { getUIFlags: () => ({ isCreating: false }) },
        actions: { create },
      },
      kchatProducts: {
        namespaced: true,
        getters: { getProducts: () => [makeProduct()] },
        actions: { fetch: vi.fn() },
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(OrderForm, { props, global: { plugins: [store, i18n] } });
};

describe('OrderForm', () => {
  it('cannot submit without items', async () => {
    const create = vi.fn();
    const wrapper = mountForm({}, create);
    const submit = wrapper.find('[data-test="submit"]');
    expect(submit.attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit');
    expect(create).not.toHaveBeenCalled();
  });

  it('submits product lines with chat source and emits created', async () => {
    const create = vi.fn().mockResolvedValue(makeOrder());
    const wrapper = mountForm({ contactId: 7, conversationId: 12 }, create);
    await wrapper.find('[data-test="line-product"]').setValue('1');
    await wrapper.find('[data-test="line-quantity"]').setValue('2');
    expect(
      wrapper.find('[data-test="submit"]').attributes('disabled')
    ).toBeUndefined();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(create.mock.calls[0][1]).toMatchObject({
      contact_id: 7,
      conversation_id: 12,
      source: 'chat',
      payment_method: 'transfer_qr',
      items: [{ product_id: 1, quantity: 2 }],
    });
    expect(wrapper.emitted('created')[0][0].number).toBe(1042);
  });

  it('shows insufficient_stock as "Không đủ hàng"', async () => {
    const create = vi.fn().mockRejectedValue({
      response: { data: { error: 'insufficient_stock' } },
    });
    const wrapper = mountForm({}, create);
    await wrapper.find('[data-test="line-product"]').setValue('1');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('Không đủ hàng');
    expect(wrapper.emitted('created')).toBeUndefined();
  });
});
