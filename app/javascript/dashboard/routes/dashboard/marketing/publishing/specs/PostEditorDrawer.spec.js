import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import postsAPI from 'dashboard/api/kchat/posts';
import PostEditorDrawer from '../PostEditorDrawer.vue';

vi.mock('dashboard/api/kchat/posts', () => ({
  default: {
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    unapprove: vi.fn(),
    retryPublish: vi.fn(),
    requestMedia: vi.fn(),
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
// vi.mock is hoisted above the imports: the flag must be hoisted too.
const isAdmin = vi.hoisted(() => ({ value: true }));
vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => isAdmin.value) }) };
});

const PAGES = [{ id: 3, name: 'Trà Sen' }];

const basePost = (attrs = {}) => ({
  id: 11,
  status: 'draft',
  post_format: 'text',
  caption: 'Bài cũ',
  link_url: '',
  pillar: '',
  media_brief: '',
  scheduled_at: '2026-12-01T02:30:00Z',
  inbox_id: 3,
  media: [],
  blockers: [],
  ...attrs,
});

const mountDrawer = props =>
  mount(PostEditorDrawer, {
    props: { pages: PAGES, ...props },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
    attachTo: document.body,
  });

describe('PostEditorDrawer', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    isAdmin.value = true;
  });

  afterEach(() => wrapper?.unmount());

  it('creates a new draft with the caption and the first Page', async () => {
    postsAPI.create.mockResolvedValue({ data: basePost({ id: 20 }) });
    wrapper = mountDrawer({ post: null, defaultSchedule: '2026-12-01T09:00' });

    await wrapper.find('[data-test="post-caption"]').setValue('Ra mắt trà sen');
    await wrapper.find('[data-test="post-save"]').trigger('click');
    await flushPromises();

    const body = postsAPI.create.mock.calls[0][0];
    expect(body.get('caption')).toBe('Ra mắt trà sen');
    expect(body.get('inbox_id')).toBe('3');
    expect(body.get('scheduled_at')).not.toBe('');
    expect(wrapper.emitted('saved')[0][0].id).toBe(20);
  });

  it('shows why a post cannot be sent for review', async () => {
    postsAPI.submit.mockRejectedValue({
      response: {
        data: { error: 'not_publishable', blockers: ['schedule_required'] },
      },
    });
    wrapper = mountDrawer({ post: basePost() });

    await wrapper.find('[data-test="post-submit"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="post-blockers"]').text()).toContain(
      'Chưa chọn giờ đăng.'
    );
  });

  it('lets an administrator approve a pending post, not an agent', async () => {
    postsAPI.approve.mockResolvedValue({
      data: basePost({ status: 'approved' }),
    });
    wrapper = mountDrawer({ post: basePost({ status: 'pending_approval' }) });
    await wrapper.find('[data-test="post-approve"]').trigger('click');
    await flushPromises();
    expect(postsAPI.approve).toHaveBeenCalledWith(11);
    expect(wrapper.find('[data-test="post-status"]').text()).toBe(
      'Đã duyệt, chờ đăng'
    );
    wrapper.unmount();

    isAdmin.value = false;
    wrapper = mountDrawer({ post: basePost({ status: 'pending_approval' }) });
    expect(wrapper.find('[data-test="post-approve"]').exists()).toBe(false);
  });

  it('sends a post with a media brief to the studio', async () => {
    postsAPI.requestMedia.mockResolvedValue({
      data: basePost({
        media_brief: 'Reels 20 giây',
        media_request_status: 'requested',
      }),
    });
    wrapper = mountDrawer({ post: basePost({ media_brief: 'Reels 20 giây' }) });

    await wrapper.find('[data-test="post-request-media"]').trigger('click');
    await flushPromises();

    expect(postsAPI.update).not.toHaveBeenCalled();
    expect(postsAPI.requestMedia).toHaveBeenCalledWith(11);
    expect(wrapper.find('[data-test="post-media-request"]').text()).toBe(
      'Đã gửi studio'
    );
    expect(wrapper.find('[data-test="post-request-media"]').exists()).toBe(
      false
    );
  });

  it('is read-only once published and links to the post', () => {
    wrapper = mountDrawer({
      post: basePost({
        status: 'published',
        permalink: 'https://www.facebook.com/1',
      }),
    });
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-test="post-save"]').exists()).toBe(false);
    expect(wrapper.find('a[href="https://www.facebook.com/1"]').exists()).toBe(
      true
    );
  });
});
