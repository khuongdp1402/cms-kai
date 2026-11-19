import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PhoneNumberInput from '../PhoneNumberInput.vue';

const DropdownStub = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  template: '<ul />',
};

const mountInput = locale =>
  mount(PhoneNumberInput, {
    global: {
      plugins: [createI18n({ legacy: false, locale, messages: {} })],
      directives: { onClickaway: {} },
      stubs: { DropdownMenu: DropdownStub },
    },
  });

const openCountries = async wrapper => {
  await wrapper.find('button').trigger('click');
  return wrapper.findComponent(DropdownStub).props('menuItems');
};

describe('PhoneNumberInput country names', () => {
  it('names countries in Vietnamese for a Vietnamese shop, sorted in Vietnamese', async () => {
    const items = await openCountries(mountInput('vi'));
    const vn = items.find(item => item.value === 'VN');
    expect(vn.label).toBe('Việt Nam');
    expect(vn.dialCode).toBe('+84');
    expect(items.find(item => item.value === 'US').label).toBe('Hoa Kỳ');
    const labels = items.map(item => item.label);
    expect(labels).toEqual(
      [...labels].sort((a, b) => a.localeCompare(b, 'vi'))
    );
  });

  it('keeps English names in English', async () => {
    const items = await openCountries(mountInput('en'));
    expect(items.find(item => item.value === 'VN').label).toBe('Vietnam');
  });
});
