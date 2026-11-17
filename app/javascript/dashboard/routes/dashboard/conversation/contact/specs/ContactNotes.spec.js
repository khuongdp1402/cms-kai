// Characterization spec for ContactNotes (chat-parity C-87).
// Pins routes/dashboard/conversation/contact/ContactNotes.vue:
//  - loads the notes when the contact id is set/changes                        :98-106
//  - Cmd/Ctrl+Enter creates the note (works while typing)                       :83-91
//  - creating requires a contact id and non-empty content, creates through
//    contactNotes/create then closes the modal                                  :57-70
//  - deleting dispatches contactNotes/delete with the contact id               :72-80
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import ContactNotes from '../ContactNotes.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const actions = {
  'contactNotes/get': vi.fn(),
  'contactNotes/create': vi.fn(() => Promise.resolve()),
  'contactNotes/delete': vi.fn(),
};

const mountNotes = (props = {}) =>
  shallowMount(ContactNotes, {
    props: { contactId: 8, ...props },
    global: {
      plugins: [
        createStore({
          getters: {
            getCurrentUser: () => ({ id: 1 }),
            'contactNotes/getUIFlags': () => ({}),
            'contactNotes/getAllNotesByContactId': () => () => [
              { id: 1, content: 'n1', user: { id: 1 } },
            ],
          },
          actions,
        }),
      ],
    },
  });

const events = () => useKeyboardEvents.mock.calls.at(-1)[0];

describe('ContactNotes', () => {
  it('fetches the notes of the contact on mount', () => {
    mountNotes();
    expect(actions['contactNotes/get']).toHaveBeenCalledWith(
      expect.anything(),
      {
        contactId: 8,
      }
    );
  });

  it('registers Cmd/Ctrl+Enter that works while typing', () => {
    mountNotes();
    expect(Object.keys(events())).toEqual(['$mod+Enter']);
    expect(events()['$mod+Enter'].allowOnFocusedInput).toBe(true);
  });

  it('Cmd/Ctrl+Enter with empty content does not create a note', async () => {
    const wrapper = mountNotes();
    wrapper.vm.openCreateModal();
    await events()['$mod+Enter'].action();
    expect(actions['contactNotes/create']).not.toHaveBeenCalled();
  });

  it('Cmd/Ctrl+Enter with content creates the note and closes the modal', async () => {
    const wrapper = mountNotes();
    wrapper.vm.openCreateModal();
    wrapper.vm.noteContent = 'goi lai chieu mai';
    await events()['$mod+Enter'].action();
    await flushPromises();
    expect(actions['contactNotes/create']).toHaveBeenCalledWith(
      expect.anything(),
      { content: 'goi lai chieu mai', contactId: 8 }
    );
    expect(wrapper.vm.shouldShowCreateModal).toBe(false);
    expect(wrapper.vm.noteContent).toBe('');
  });

  it('deleting a note dispatches contactNotes/delete with the contact id', () => {
    const wrapper = mountNotes();
    wrapper.vm.onDelete(1);
    expect(actions['contactNotes/delete']).toHaveBeenCalledWith(
      expect.anything(),
      { noteId: 1, contactId: 8 }
    );
  });

  it('refetches notes when the contact changes', async () => {
    const wrapper = mountNotes();
    await wrapper.setProps({ contactId: 9 });
    expect(actions['contactNotes/get']).toHaveBeenLastCalledWith(
      expect.anything(),
      { contactId: 9 }
    );
  });
});
