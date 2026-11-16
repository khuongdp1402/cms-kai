import { mount } from '@vue/test-utils';
import OnboardingFormRow from '../../account-details/OnboardingFormRow.vue';

describe('OnboardingFormRow', () => {
  const mountRow = props =>
    mount(OnboardingFormRow, {
      props: { title: 'Website', icon: 'i-lucide-globe', ...props },
      global: { stubs: { Icon: true } },
    });

  it('marks a required row with an aria-hidden asterisk, so screen readers do not read "asterisk"', () => {
    const marker = mountRow({ required: true }).find(
      'span[aria-hidden="true"]'
    );
    expect(marker.exists()).toBe(true);
    expect(marker.text()).toBe('*');
  });

  it('shows no marker for optional rows', () => {
    expect(mountRow().find('span[aria-hidden="true"]').exists()).toBe(false);
  });
});
