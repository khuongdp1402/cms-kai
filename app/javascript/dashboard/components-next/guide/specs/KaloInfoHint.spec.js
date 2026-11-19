import { mount } from '@vue/test-utils';
import KaloInfoHint from '../KaloInfoHint.vue';

const mountHint = () =>
  mount(KaloInfoHint, {
    props: { label: 'Giải thích chỉ số', text: 'Thời gian trả lời đầu tiên' },
    attachTo: document.body,
  });

describe('KaloInfoHint', () => {
  it('has an accessible name and stays closed until asked', () => {
    const wrapper = mountHint();
    const button = wrapper.find('[data-test-id="kalo-info-hint"]');
    expect(button.attributes('aria-label')).toBe('Giải thích chỉ số');
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false);
  });

  it('opens on focus and tap, links the text, and closes on blur', async () => {
    const wrapper = mountHint();
    const button = wrapper.find('[data-test-id="kalo-info-hint"]');
    await button.trigger('focus');
    const tip = wrapper.find('[role="tooltip"]');
    expect(tip.text()).toBe('Thời gian trả lời đầu tiên');
    expect(button.attributes('aria-describedby')).toBe(tip.attributes('id'));
    await button.trigger('click');
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true);
    await button.trigger('blur');
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false);
  });
});
