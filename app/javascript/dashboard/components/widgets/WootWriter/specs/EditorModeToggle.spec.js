// Kalo UI phase 2 (task 1b-ii), C-51/C-70: reply vs private note are two clear tabs.
// The parent contract is unchanged: one `toggleMode` emit, fired only when the other
// tab is chosen; when replies are restricted only the note tab is usable.
import { mount } from '@vue/test-utils';
import EditorModeToggle from '../EditorModeToggle.vue';

const mountToggle = (props = {}) =>
  mount(EditorModeToggle, { props: { mode: 'REPLY', ...props } });

const replyTab = w => w.find('[data-test="mode-reply"]');
const noteTab = w => w.find('[data-test="mode-note"]');

describe('EditorModeToggle (reply / note tabs)', () => {
  it('marks the active tab with aria-selected', () => {
    const wrapper = mountToggle();
    expect(replyTab(wrapper).attributes('aria-selected')).toBe('true');
    expect(noteTab(wrapper).attributes('aria-selected')).toBe('false');
  });

  it('the note tab carries the lock icon', () => {
    const wrapper = mountToggle();
    expect(noteTab(wrapper).find('use').attributes('href')).toBe(
      '/kalo-icons.svg#i-lock'
    );
  });

  it('choosing the note tab from reply emits toggleMode once', async () => {
    const wrapper = mountToggle();
    await noteTab(wrapper).trigger('click');
    expect(wrapper.emitted('toggleMode')).toHaveLength(1);
  });

  it('choosing the tab that is already active does nothing', async () => {
    const wrapper = mountToggle({ mode: 'NOTE' });
    await noteTab(wrapper).trigger('click');
    expect(wrapper.emitted('toggleMode')).toBeUndefined();
  });

  it('choosing reply from note emits toggleMode', async () => {
    const wrapper = mountToggle({ mode: 'NOTE' });
    await replyTab(wrapper).trigger('click');
    expect(wrapper.emitted('toggleMode')).toHaveLength(1);
  });

  it('restricted replies: note is selected and the reply tab is disabled', async () => {
    const wrapper = mountToggle({ isReplyRestricted: true });
    expect(noteTab(wrapper).attributes('aria-selected')).toBe('true');
    expect(replyTab(wrapper).attributes('disabled')).toBeDefined();
    await replyTab(wrapper).trigger('click');
    expect(wrapper.emitted('toggleMode')).toBeUndefined();
  });

  it('disabled (copilot busy / recording) blocks both tabs', () => {
    const wrapper = mountToggle({ disabled: true });
    expect(replyTab(wrapper).attributes('disabled')).toBeDefined();
    expect(noteTab(wrapper).attributes('disabled')).toBeDefined();
  });
});
