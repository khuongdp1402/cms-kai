// Icon-only controls must have an accessible name (final visual QA, Task 7 item 1).
// Mounted with the real Vietnamese messages (upstream vi + ktech overlay) so the
// names are checked as the shop owner hears them from a screen reader.
import { mount, shallowMount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createStore } from 'vuex';
import { createRouter, createMemoryHistory } from 'vue-router';
import upstreamMessages from 'dashboard/i18n';
import ktechOverrides from 'dashboard/i18n/ktech';
import { applyLocaleOverrides } from 'shared/helpers/localeOverrides';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader.vue';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox.vue';
import SidebarNotificationBell from 'dashboard/components-next/sidebar/SidebarNotificationBell.vue';
import SidepanelSwitch from 'dashboard/components-next/Conversation/SidepanelSwitch.vue';
import ContactInfoRow from 'dashboard/routes/dashboard/conversation/contact/ContactInfoRow.vue';
import ConversationCard from 'dashboard/components/widgets/conversation/ConversationCard.vue';
import ResolveAction from 'dashboard/components/buttons/ResolveAction.vue';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useConversationRequiredAttributes', () => ({
  useConversationRequiredAttributes: () => ({
    checkMissingAttributes: vi.fn(),
  }),
}));
vi.mock('dashboard/composables/useUISettings', async () => {
  const { ref } = await import('vue');
  return {
    useUISettings: () => ({
      uiSettings: ref({ is_contact_sidebar_open: true }),
      updateUISettings: vi.fn(),
    }),
  };
});
vi.mock('dashboard/composables/useContactPanel', () => ({
  useContactPanel: () => ({
    isSmallScreen: { value: false },
    isContactPanelOpenFor: () => true,
    openContactPanel: vi.fn(),
    closeContactPanel: vi.fn(),
    toggleContactPanel: vi.fn(),
  }),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'vi',
  fallbackLocale: 'vi',
  messages: applyLocaleOverrides(upstreamMessages, ktechOverrides),
});

const store = createStore({
  getters: {
    'notifications/getMeta': () => ({ unreadCount: 3 }),
    getCurrentAccountId: () => 1,
    'accounts/isFeatureEnabledonAccount': () => () => false,
    getSelectedChat: () => ({ id: 7, status: 'open' }),
  },
  actions: { toggleStatus: vi.fn() },
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
});

const global = {
  plugins: [i18n, store, router],
  directives: { 'on-clickaway': {}, 'dompurify-html': {} },
  // the global vitest setup stubs NextButton with a bare <button>; use the real one
  stubs: { NextButton: false },
};

const ariaLabels = wrapper =>
  wrapper.findAll('button').map(b => b.attributes('aria-label'));

describe('icon-only controls have Vietnamese accessible names', () => {
  it('contact panel header: close button', () => {
    const wrapper = mount(SidebarActionsHeader, {
      props: { title: 'Liên hệ' },
      global,
    });
    expect(ariaLabels(wrapper)).toEqual(['Đóng']);
  });

  it('contact info rows: copy and edit buttons name the field', () => {
    const wrapper = mount(ContactInfoRow, {
      props: {
        href: 'mailto:a@b.vn',
        value: 'a@b.vn',
        icon: 'mail',
        emoji: '',
        title: 'Email',
        showCopy: true,
        editable: true,
      },
      global,
    });
    expect(ariaLabels(wrapper)).toEqual(['Sao chép Email', 'Sửa Email']);
  });

  it('thread header: contact panel switch', () => {
    const wrapper = mount(SidepanelSwitch, { global });
    const button = wrapper.find('button');
    expect(button.attributes('aria-label')).toBe('Liên hệ');
    expect(button.attributes('aria-pressed')).toBe('true');
  });

  it('resolve button group: dropdown arrow', () => {
    const wrapper = mount(ResolveAction, {
      global: {
        ...global,
        stubs: { ...global.stubs, ConversationResolveAttributesModal: true },
      },
    });
    const arrow = wrapper
      .findAll('button')
      .find(b => b.attributes('aria-haspopup') === 'menu');
    expect(arrow.attributes('aria-label')).toBe('Tùy chọn trạng thái khác');
    expect(arrow.attributes('aria-expanded')).toBe('false');
  });

  it('rail: notifications bell', () => {
    const wrapper = mount(SidebarNotificationBell, { global });
    expect(wrapper.find('button').attributes('aria-label')).toBe('Thông báo');
  });

  it('checkbox forwards aria-label to the native input', () => {
    const wrapper = mount(Checkbox, {
      props: { ariaLabel: 'Chọn' },
      global,
    });
    expect(wrapper.find('input').attributes('aria-label')).toBe('Chọn');
  });

  it('conversation list row: selection checkbox names the contact', () => {
    const wrapper = shallowMount(ConversationCard, {
      props: {
        chat: { id: 1, labels: [], messages: [], unread_count: 0 },
        currentContact: { name: 'Lan', thumbnail: '' },
        inbox: { id: 1 },
        selected: true,
      },
      global: {
        ...global,
        stubs: {
          Avatar: {
            template: '<div><slot name="overlay" :size="40" /></div>',
          },
          Checkbox,
        },
      },
    });
    expect(
      wrapper.find('input[type="checkbox"]').attributes('aria-label')
    ).toBe('Chọn cuộc trò chuyện với Lan');
  });
});
