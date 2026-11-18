import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import CommandBar from '../commandbar.vue';

vi.mock('@chatwoot/ninja-keys', () => ({}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: vi.fn() }),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/commands/useAppearanceHotKeys', () => ({
  useAppearanceHotKeys: () => ({ goToAppearanceHotKeys: { value: [] } }),
}));
vi.mock('dashboard/composables/commands/useInboxHotKeys', () => ({
  useInboxHotKeys: () => ({ inboxHotKeys: { value: [] } }),
}));
vi.mock('dashboard/composables/commands/useGoToCommandHotKeys', () => ({
  useGoToCommandHotKeys: () => ({ goToCommandHotKeys: { value: [] } }),
}));
vi.mock('dashboard/composables/commands/useBulkActionsHotKeys', () => ({
  useBulkActionsHotKeys: () => ({ bulkActionsHotKeys: { value: [] } }),
}));
vi.mock('dashboard/composables/commands/useConversationHotKeys', () => ({
  useConversationHotKeys: () => ({ conversationHotKeys: { value: [] } }),
}));

const HINTS = viMessages.KALO_POLISH.COMMAND_BAR;

describe('commandbar', () => {
  it('replaces the English ninja-keys footer with Vietnamese hints', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'vi',
      messages: { vi: viMessages },
    });
    const wrapper = mount(CommandBar, { global: { plugins: [i18n] } });
    const footer = wrapper.find('[data-test-id="command-bar-footer"]');

    expect(footer.attributes('slot')).toBe('footer');
    [HINTS.SELECT, HINTS.NAVIGATE, HINTS.CLOSE, HINTS.PARENT].forEach(hint =>
      expect(footer.text()).toContain(hint)
    );
    expect(footer.text()).not.toMatch(/to select|to navigate|to close/);
  });
});
