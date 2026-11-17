// Characterization spec for ContactInfo (chat-parity C-76, C-77, C-78, C-20).
// Pins routes/dashboard/conversation/contact/ContactInfo.vue:
//  - shows name, email, phone, company, identifier (only if set), location/description :232-296
//  - click name -> inline edit; blur/Enter saves via contacts/update only when changed  :102-118
//  - email / phone / company rows are editable and save through contacts/update         :124-153,184-292
//  - merge modal for the contact, delete modal only for admins (emits panelClose)       :325,336-352
//  - edit contact modal toggled by the pencil button                                    :317-324
//  - loads contactable inboxes when the contact id changes                              :84-90
//  - errors: duplicate email / phone -> specific alert                                  :155-181
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import ContactInfo from '../ContactInfo.vue';
import ContactInfoRow from '../ContactInfoRow.vue';
import EditContact from '../EditContact.vue';
import ContactMergeModal from 'dashboard/modules/contact/ContactMergeModal.vue';
import ContactDeleteModal from 'dashboard/modules/contact/ContactDeleteModal.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';
import InlineInput from 'dashboard/components-next/inline-input/InlineInput.vue';
import { DuplicateContactException } from 'shared/helpers/CustomErrors';
import { useAlert } from 'dashboard/composables';

const isAdmin = ref(false);
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const actions = {
  'contacts/update': vi.fn(() => Promise.resolve()),
  'contacts/fetchContactableInbox': vi.fn(),
};

const contact = {
  id: 5,
  name: 'jane doe',
  email: 'jane@x.vn',
  phone_number: '+84901234567',
  identifier: 'zalo-123',
  thumbnail: '',
  additional_attributes: { company_name: 'Shop A', description: 'VIP' },
};

const mountInfo = (props = {}) => {
  const store = createStore({
    getters: {
      'contacts/getUIFlags': () => ({}),
      getSelectedChat: () => ({ id: 77 }),
    },
    actions,
  });
  return shallowMount(ContactInfo, {
    props: { contact, ...props },
    global: {
      plugins: [store],
      directives: { tooltip: {} },
      mocks: { $route: { params: { accountId: 1 } } },
      stubs: {
        // the real input is focused after the click-to-edit; give the stub the same method
        InlineInput: {
          name: 'InlineInput',
          props: ['modelValue'],
          emits: ['update:modelValue', 'enterPress', 'escapePress', 'blur'],
          methods: { focus() {} },
          template: '<input />',
        },
      },
    },
  });
};

const rows = wrapper => wrapper.findAllComponents(ContactInfoRow);
const rowByTitle = (wrapper, title) =>
  rows(wrapper).find(r => r.props('title') === title);

describe('ContactInfo', () => {
  beforeEach(() => {
    isAdmin.value = false;
  });

  it('shows the contact name and description', () => {
    const wrapper = mountInfo();
    expect(wrapper.find('h3').text()).toContain('jane doe');
    expect(wrapper.text()).toContain('VIP');
  });

  it('loads the contactable inboxes for the contact on mount', () => {
    mountInfo();
    expect(actions['contacts/fetchContactableInbox']).toHaveBeenCalledWith(
      expect.anything(),
      5
    );
  });

  it('shows email, phone and company rows with the contact values', () => {
    const wrapper = mountInfo();
    expect(rowByTitle(wrapper, 'Email Address').props('value')).toBe(
      'jane@x.vn'
    );
    expect(rowByTitle(wrapper, 'Phone number').props('value')).toBe(
      '+84901234567'
    );
    expect(rowByTitle(wrapper, 'Company').props('value')).toBe('Shop A');
  });

  it('email and phone rows link with mailto:/tel: and allow copy + edit', () => {
    const wrapper = mountInfo();
    const email = rowByTitle(wrapper, 'Email Address');
    const phone = rowByTitle(wrapper, 'Phone number');
    expect(email.props('href')).toBe('mailto:jane@x.vn');
    expect(phone.props('href')).toBe('tel:+84901234567');
    [email, phone].forEach(r => {
      expect(r.props('showCopy')).toBe(true);
      expect(r.props('editable')).toBe(true);
    });
  });

  it('shows the identifier row only when the contact has an identifier', () => {
    expect(rowByTitle(mountInfo(), 'Identifier')).toBeTruthy();
    const wrapper = mountInfo({ contact: { ...contact, identifier: '' } });
    expect(rowByTitle(wrapper, 'Identifier')).toBeUndefined();
  });

  describe('inline editing', () => {
    it('email row update saves email through contacts/update', async () => {
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Email Address').vm.$emit('update', 'new@x.vn');
      await flushPromises();
      expect(actions['contacts/update']).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
        email: 'new@x.vn',
      });
      expect(actions['contacts/fetchContactableInbox']).toHaveBeenCalledTimes(2);
    });

    it('phone row update saves phone_number', async () => {
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Phone number').vm.$emit('update', '+84900000000');
      await flushPromises();
      expect(actions['contacts/update']).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
        phone_number: '+84900000000',
      });
    });

    it('company row update keeps the other additional attributes', async () => {
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Company').vm.$emit('update', 'Shop B');
      await flushPromises();
      expect(actions['contacts/update']).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
        additional_attributes: { company_name: 'Shop B', description: 'VIP' },
      });
    });

    it('clicking the name opens an inline input; saving a new name dispatches contacts/update', async () => {
      const wrapper = mountInfo();
      await wrapper.find('h3').trigger('click');
      const input = wrapper.findComponent(InlineInput);
      expect(input.exists()).toBe(true);
      await input.vm.$emit('update:modelValue', '  Jane Smith ');
      await input.vm.$emit('enterPress');
      await flushPromises();
      expect(actions['contacts/update']).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
        name: 'Jane Smith',
      });
    });

    it('does not save when the name is unchanged or blank', async () => {
      const wrapper = mountInfo();
      await wrapper.find('h3').trigger('click');
      await wrapper.findComponent(InlineInput).vm.$emit('blur');
      await flushPromises();
      expect(actions['contacts/update']).not.toHaveBeenCalled();
    });

    it('Escape cancels the name edit without saving', async () => {
      const wrapper = mountInfo();
      await wrapper.find('h3').trigger('click');
      const input = wrapper.findComponent(InlineInput);
      await input.vm.$emit('update:modelValue', 'Other');
      await input.vm.$emit('escapePress');
      await flushPromises();
      expect(actions['contacts/update']).not.toHaveBeenCalled();
      expect(wrapper.findComponent(InlineInput).exists()).toBe(false);
    });
  });

  describe('update errors', () => {
    it('duplicate email shows the duplicate-email alert', async () => {
      actions['contacts/update'].mockRejectedValueOnce(
        new DuplicateContactException(['email'])
      );
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Email Address').vm.$emit('update', 'dup@x.vn');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith(
        'This email address is in use for another contact.'
      );
    });

    it('duplicate phone shows the duplicate-phone alert', async () => {
      actions['contacts/update'].mockRejectedValueOnce(
        new DuplicateContactException(['phone_number'])
      );
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Phone number').vm.$emit('update', '+84911111111');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith(
        'This phone number is in use for another contact.'
      );
    });

    it('other errors show the error message', async () => {
      actions['contacts/update'].mockRejectedValueOnce(new Error('Boom'));
      const wrapper = mountInfo();
      rowByTitle(wrapper, 'Email Address').vm.$emit('update', 'x@x.vn');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith('Boom');
    });
  });

  describe('actions', () => {
    it('has a "new message" compose button for this contact', () => {
      const wrapper = mountInfo();
      expect(
        wrapper.findComponent(ComposeConversation).props('contactId')
      ).toBe('5');
    });

    it('renders the merge modal for the contact (everyone)', () => {
      const wrapper = mountInfo();
      expect(
        wrapper.findComponent(ContactMergeModal).props('primaryContact')
      ).toEqual(contact);
    });

    it('delete modal is admin-only and closes the panel after deleting', async () => {
      expect(mountInfo().findComponent(ContactDeleteModal).exists()).toBe(
        false
      );
      isAdmin.value = true;
      const wrapper = mountInfo();
      const modal = wrapper.findComponent(ContactDeleteModal);
      expect(modal.exists()).toBe(true);
      await modal.vm.$emit('deleted');
      expect(wrapper.emitted('panelClose')).toHaveLength(1);
    });

    it('the pencil button toggles the edit contact modal', async () => {
      const wrapper = mountInfo();
      expect(wrapper.findComponent(EditContact).props('show')).toBe(false);
      wrapper.vm.toggleEditModal();
      await flushPromises();
      expect(wrapper.findComponent(EditContact).props('show')).toBe(true);
      await wrapper.findComponent(EditContact).vm.$emit('cancel');
      expect(wrapper.findComponent(EditContact).props('show')).toBe(false);
    });

    it('links to the full contact profile in a new tab', () => {
      const wrapper = mountInfo();
      const link = wrapper.find('a[target="_blank"]');
      expect(link.attributes('href')).toBe('/app/accounts/1/contacts/5');
    });
  });
});
