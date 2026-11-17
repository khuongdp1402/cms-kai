// Characterization spec for WootMessageEditor suggestion menus (chat-parity C-55, C-56, C-57, C-58, C-66).
// Pins components/widgets/WootWriter/Editor.vue:
//  - "/" canned responses menu is shown only for replies (never in private notes)   :236-242,885
//  - "@" agent mention menu is shown only in private notes                           :286-297,880
//  - "{{" variables menu only for replies; ":" emoji menu in both                    :244-247,305-312,890-895
//  - menu visibility is reported to the ReplyBox (`toggleCannedMenu`,
//    `toggleUserMention`, `toggleVariablesMenu`) so Enter does not send while a menu is open :338-349
//  - the ProseMirror trigger logic itself (typing "/" or "@") cannot be driven in jsdom;
//    only the visibility rules and emits are pinned.
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import Editor from '../Editor.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    fetchSignatureFlagFromUISettings: vi.fn(() => false),
  }),
}));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({ captainTasksEnabled: false }),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const stubs = {
  TagAgents: { name: 'TagAgents', template: '<div class="tag-agents" />' },
  CannedResponse: {
    name: 'CannedResponse',
    template: '<div class="canned" />',
  },
  VariableList: { name: 'VariableList', template: '<div class="variables" />' },
  KeyboardEmojiSelector: {
    name: 'KeyboardEmojiSelector',
    template: '<div class="emoji" />',
  },
  TagTools: true,
  CopilotMenuBar: true,
};

const mountEditor = (props = {}) =>
  mount(Editor, {
    attachTo: document.body,
    props: {
      modelValue: '',
      editorId: 'draft-1-REPLY',
      enableVariables: true,
      focusOnMount: false,
      ...props,
    },
    global: {
      plugins: [
        createStore({
          getters: {
            getCurrentAccountId: () => 1,
            'accounts/isFeatureEnabledonAccount': () => () => false,
            getCurrentUser: () => ({}),
          },
        }),
      ],
      directives: { 'on-click-outside': {}, tooltip: {} },
      stubs,
    },
  });

const state = w => w.vm.$.setupState;

describe('Editor suggestion menus', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it('mounts and creates the ProseMirror editor element', () => {
    wrapper = mountEditor();
    expect(wrapper.find('.ProseMirror').exists()).toBe(true);
  });

  it('canned responses menu shows for a reply when triggered', async () => {
    wrapper = mountEditor();
    state(wrapper).showCannedMenu = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.canned').exists()).toBe(true);
  });

  it('canned responses menu never shows in a private note', async () => {
    wrapper = mountEditor({ isPrivate: true });
    state(wrapper).showCannedMenu = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.canned').exists()).toBe(false);
  });

  it('canned responses menu can be disabled by the prop', async () => {
    wrapper = mountEditor({ enableCannedResponses: false });
    state(wrapper).showCannedMenu = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.canned').exists()).toBe(false);
  });

  it('@mention agent menu shows only in a private note', async () => {
    wrapper = mountEditor({ isPrivate: true });
    state(wrapper).showUserMentions = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.tag-agents').exists()).toBe(true);
    wrapper.unmount();
    wrapper = mountEditor({ isPrivate: false });
    state(wrapper).showUserMentions = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.tag-agents').exists()).toBe(false);
  });

  it('variables menu shows for replies when enabled, never in notes', async () => {
    wrapper = mountEditor();
    state(wrapper).showVariables = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.variables').exists()).toBe(true);
    wrapper.unmount();
    wrapper = mountEditor({ isPrivate: true });
    state(wrapper).showVariables = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.variables').exists()).toBe(false);
  });

  it('variables menu is off unless enableVariables is set', async () => {
    wrapper = mountEditor({ enableVariables: false });
    state(wrapper).showVariables = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.variables').exists()).toBe(false);
  });

  it('emoji menu shows in both modes', async () => {
    wrapper = mountEditor({ isPrivate: true });
    state(wrapper).showEmojiMenu = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.emoji').exists()).toBe(true);
  });

  it('reports menu visibility to the parent (so Enter does not send while a menu is open)', async () => {
    wrapper = mountEditor();
    state(wrapper).showCannedMenu = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('toggleCannedMenu')).toEqual([[true]]);
    state(wrapper).showVariables = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('toggleVariablesMenu')).toEqual([[true]]);
  });

  it('reports the @mention menu only in private notes', async () => {
    wrapper = mountEditor({ isPrivate: true });
    state(wrapper).showUserMentions = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('toggleUserMention')).toEqual([[true]]);
  });

  it('exposes focusEditorInputField for the ReplyBox', () => {
    wrapper = mountEditor();
    expect(typeof wrapper.vm.focusEditorInputField).toBe('function');
  });

  it('registers Alt+P / Alt+L (focus editor) and Cmd/Ctrl+Shift+V (inline image paste, C-62)', () => {
    wrapper = mountEditor();
    const events = useKeyboardEvents.mock.calls.at(-1)[0];
    expect(Object.keys(events).sort()).toEqual(
      ['$mod+Shift+KeyV', 'Alt+KeyL', 'Alt+KeyP'].sort()
    );
    expect(events['Alt+KeyP'].allowOnFocusedInput).toBe(false);
    expect(events['Alt+KeyL'].allowOnFocusedInput).toBe(false);
    expect(events['$mod+Shift+KeyV'].allowOnFocusedInput).toBe(true);
  });

  it('inline image paste is a no-op without clipboard.read (jsdom) and never throws', async () => {
    wrapper = mountEditor({ channelType: 'Channel::Email' });
    const events = useKeyboardEvents.mock.calls.at(-1)[0];
    await expect(events['$mod+Shift+KeyV'].action()).resolves.toBeUndefined();
  });
});

// Kalo UI phase 2 (task 1b-ii): the "Mẫu câu" button needs the character before the
// cursor, because the "/" menu only opens after whitespace or at the start of a line.
describe('Editor charBeforeCursor', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it.each([
    ['', 'start', ''],
    ['hello', 'start', ''],
    ['hello', 'end', 'o'],
  ])(
    'text "%s" with the cursor at the %s gives "%s"',
    (text, pos, expected) => {
      wrapper = mountEditor({ modelValue: text });
      wrapper.vm.focusEditorInputField(pos);
      expect(wrapper.vm.charBeforeCursor()).toBe(expected);
    }
  );
});
