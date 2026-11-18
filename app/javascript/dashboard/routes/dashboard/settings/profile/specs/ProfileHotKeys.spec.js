// The send-message hotkey cards follow the app locale even when the page is
// created before the account locale is applied (direct load of /profile/settings).
import { shallowMount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createStore } from 'vuex';
import upstreamMessages from 'dashboard/i18n';
import ktechOverrides from 'dashboard/i18n/ktech';
import { applyLocaleOverrides } from 'shared/helpers/localeOverrides';
import ProfileIndex from '../Index.vue';

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    isEditorHotKeyEnabled: key => key === 'enter',
    updateUISettings: vi.fn(),
  }),
}));
vi.mock('dashboard/composables/useFontSize', () => ({
  useFontSize: () => ({ currentFontSize: 'default', updateFontSize: vi.fn() }),
}));

describe('Profile hotkey cards', () => {
  it('re-translates when the locale switches to vi after mount', async () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: applyLocaleOverrides(upstreamMessages, ktechOverrides),
    });
    const store = createStore({
      getters: {
        getCurrentUser: () => ({ accounts: [] }),
        getCurrentUserID: () => null,
        'globalConfig/get': () => ({}),
        'globalConfig/isOnChatwootCloud': () => false,
      },
    });
    const wrapper = shallowMount(ProfileIndex, {
      global: {
        plugins: [i18n, store],
        mocks: { $route: { hash: '' } },
        stubs: { SectionLayout: { template: '<div><slot /></div>' } },
      },
    });
    const descriptions = () =>
      wrapper
        .findAllComponents({ name: 'RadioCard' })
        .map(card => card.props('description'));

    expect(descriptions()[0]).toMatch(/^Send messages by pressing Enter/);

    i18n.global.locale.value = 'vi';
    await wrapper.vm.$nextTick();
    expect(descriptions()).toEqual([
      'Gửi tin nhắn bằng cách nhấn phím Enter thay vì nhấp vào nút gửi.',
      'Gửi tin nhắn bằng cách nhấn phím Cmd/Ctrl + enter thay vì nhấp vào nút gửi.',
    ]);
  });
});
