import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import WootInput from 'dashboard/components/widgets/forms/Input.vue';
import AddLabel from '../AddLabel.vue';

const mountForm = (props = {}) => {
  const store = createStore({
    getters: { 'labels/getUIFlags': () => ({ isCreating: false }) },
    actions: { 'labels/create': vi.fn() },
  });
  return mount(AddLabel, {
    props,
    global: {
      plugins: [store],
      components: { WootInput },
      stubs: {
        WootColorPicker: true,
        NextButton: { template: '<button><slot /></button>' },
      },
    },
  });
};

describe('AddLabel', () => {
  it('replaces spaces in the title with "-" while typing', async () => {
    const wrapper = mountForm();
    const input = wrapper.find('[data-testid="label-title"] input');
    await input.setValue('khach quen vip');
    expect(wrapper.vm.title).toBe('khach-quen-vip');
    expect(input.element.value).toBe('khach-quen-vip');
  });

  it('replaces spaces in a prefilled title', () => {
    const wrapper = mountForm({ prefillTitle: 'Khach Quen' });
    expect(wrapper.vm.title).toBe('khach-quen');
  });

  it('shows the validation message live while typing', async () => {
    const wrapper = mountForm();
    expect(wrapper.find('.message').exists()).toBe(false);
    await wrapper.find('[data-testid="label-title"] input').setValue('a');
    await flushPromises();
    expect(wrapper.find('.message').text()).toBe(
      'Minimum length 2 is required'
    );
  });
});
