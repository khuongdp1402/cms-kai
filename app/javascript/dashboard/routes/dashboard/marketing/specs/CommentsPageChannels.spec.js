import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import CommentsPage from '../CommentsPage.vue';
import CommentAutomationSettings from '../CommentAutomationSettings.vue';
import commentRulesAPI from 'dashboard/api/kchat/commentRules';

vi.mock('dashboard/api/kchat/commentRules', () => ({
  default: { get: vi.fn(), update: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const mountWith = async (component, inboxes) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['kalo_comments', 'settings_inbox_new'].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push('/app/accounts/1/kalo_comments');
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      getCurrentRole: () => 'administrator',
      getCurrentUser: () => ({
        id: 1,
        accounts: [{ id: 1, role: 'administrator' }],
      }),
      'accounts/getAccount': () => () => ({ id: 1 }),
      'inboxes/getInboxes': () => inboxes,
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(component, {
    global: { plugins: [router, store, i18n] },
  });
  await flushPromises();
  return wrapper;
};

describe('Bình luận page and Facebook/Instagram inboxes', () => {
  beforeEach(() => {
    commentRulesAPI.get.mockResolvedValue({
      data: { rules: { private_reply_template: 'Chào' } },
    });
  });

  it('explains and links to connecting a channel when none is connected', async () => {
    const wrapper = await mountWith(CommentsPage, [
      { id: 1, channel_type: 'Channel::ZaloPersonal' },
    ]);
    const notice = wrapper.find('[data-test="comments-no-channel"]');
    expect(notice.text()).toContain('Chưa nối Facebook hoặc Instagram');
    expect(notice.attributes('data-tour')).toBe('comments-rules');
    expect(
      wrapper.find('[data-test="comments-connect-channel"]').attributes('href')
    ).toBe('/app/accounts/1/settings_inbox_new');
    expect(wrapper.find('[data-test="comment-rules-form"]').exists()).toBe(
      false
    );
  });

  it('shows the rules once a Facebook page is connected', async () => {
    const wrapper = await mountWith(CommentsPage, [
      { id: 2, channel_type: 'Channel::FacebookPage' },
    ]);
    expect(wrapper.find('[data-test="comment-rules-form"]').exists()).toBe(
      true
    );
    expect(wrapper.find('[data-test="comments-no-channel"]').exists()).toBe(
      false
    );
  });

  it('explains {{name}} and inserts the variables as chips', async () => {
    const wrapper = await mountWith(CommentAutomationSettings, []);
    expect(wrapper.text()).toContain('Tự động nhắn riêng cho khách');
    expect(wrapper.text()).not.toContain('Private Reply');
    expect(wrapper.text()).toContain('“Chào {{name}}” thành “Chào Lan”');
    const chips = wrapper.findAll('[data-test="rules-template-var"]');
    expect(chips.map(chip => chip.text())).toEqual(['Tên khách', 'Tên shop']);
    await chips[0].trigger('click');
    expect(wrapper.find('[data-test="rules-template"]').element.value).toBe(
      'Chào {{name}}'
    );
  });
});
