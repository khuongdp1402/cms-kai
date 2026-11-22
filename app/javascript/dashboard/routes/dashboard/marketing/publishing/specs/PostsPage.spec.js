import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import postsAPI from 'dashboard/api/kchat/posts';
import PostsPage from '../PostsPage.vue';
import { dayKey } from '../postHelpers';

vi.mock('dashboard/api/kchat/posts', () => ({
  default: { list: vi.fn(), approve: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const FB_INBOX = {
  id: 3,
  name: 'Trà Sen',
  channel_type: 'Channel::FacebookPage',
};

const post = (id, attrs = {}) => ({
  id,
  status: 'draft',
  post_format: 'photo',
  caption: `Bài ${id}`,
  scheduled_at: new Date().toISOString(),
  inbox_id: 3,
  inbox_name: 'Trà Sen',
  media: [],
  blockers: [],
  ...attrs,
});

const mountPage = async ({
  role = 'administrator',
  inboxes = [FB_INBOX],
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/accounts/:accountId/marketing/posts',
        name: 'kalo_posts',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push('/app/accounts/1/marketing/posts');
  const store = createStore({
    getters: {
      getCurrentRole: () => role,
      'inboxes/getInboxes': () => inboxes,
      'accounts/getAccount': () => () => ({ id: 1 }),
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(PostsPage, {
    attachTo: document.body,
    global: {
      plugins: [router, store, i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Đăng bài page', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => wrapper?.unmount());

  it('loads the visible month and places a post on its day', async () => {
    postsAPI.list.mockResolvedValue({ data: { payload: [post(1)] } });
    wrapper = await mountPage();

    const params = postsAPI.list.mock.calls[0][0];
    expect(Object.keys(params)).toEqual(['from', 'to']);
    const today = wrapper.find(`[data-test="calendar-day-${dayKey(new Date())}"]`);
    expect(today.find('[data-test="calendar-post-1"]').exists()).toBe(true);

    await today.find('[data-test="calendar-post-1"]').trigger('click');
    expect(wrapper.find('[data-test="post-editor"]').exists()).toBe(true);
  });

  it('approves every ready post of the review queue', async () => {
    postsAPI.list.mockResolvedValue({ data: { payload: [] } });
    wrapper = await mountPage();
    postsAPI.list.mockResolvedValue({
      data: {
        payload: [
          post(1, { status: 'pending_approval' }),
          post(2, { status: 'pending_approval' }),
          post(3, {
            status: 'pending_approval',
            blockers: ['inbox_required'],
          }),
        ],
      },
    });
    postsAPI.approve.mockResolvedValue({ data: {} });

    await wrapper.find('[data-test="posts-tab-queue"]').trigger('click');
    await flushPromises();
    expect(postsAPI.list).toHaveBeenLastCalledWith({
      status: 'pending_approval',
    });

    await wrapper.find('[data-test="posts-approve-all"]').trigger('click');
    await flushPromises();
    expect(postsAPI.approve.mock.calls.map(c => c[0])).toEqual([1, 2]);
  });

  it('hides approval from agents', async () => {
    postsAPI.list.mockResolvedValue({
      data: { payload: [post(1, { status: 'pending_approval' })] },
    });
    wrapper = await mountPage({ role: 'agent' });
    await wrapper.find('[data-test="posts-tab-queue"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="post-quick-approve-1"]').exists()).toBe(
      false
    );
  });

  it('asks to connect a Facebook Page when there is none', async () => {
    postsAPI.list.mockResolvedValue({ data: { payload: [] } });
    wrapper = await mountPage({ inboxes: [] });
    expect(wrapper.find('[data-test="posts-no-page"]').exists()).toBe(true);
  });
});
