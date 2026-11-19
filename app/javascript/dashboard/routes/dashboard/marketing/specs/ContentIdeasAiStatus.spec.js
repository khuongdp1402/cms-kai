import { mount, flushPromises } from '@vue/test-utils';
import ContentIdeas from '../ContentIdeas.vue';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/kchat/contentIdeas', () => ({
  default: { overview: vi.fn(), repurpose: vi.fn() },
}));

const mountIdeas = async ai => {
  contentIdeasAPI.overview.mockResolvedValue({ data: { jobs: [], ai } });
  const wrapper = mount(ContentIdeas, {
    attachTo: document.body,
    global: { plugins: createPageTestEnv().plugins },
  });
  await flushPromises();
  return wrapper;
};

describe('ContentIdeas and AI availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [
      { configured: false, available: false },
      'Cửa hàng chưa bật AI nên chưa tạo được ý tưởng. Liên hệ Kalo để bật AI.',
    ],
    [
      { configured: true, available: false },
      'AI tạm thời không phản hồi. Bạn thử lại sau ít phút nhé.',
    ],
  ])('disables "Tạo ý tưởng" with a note when ai is %o', async (ai, note) => {
    const wrapper = await mountIdeas(ai);
    const submit = wrapper.find('[data-test="ideas-submit"]');
    expect(submit.attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-test="ideas-ai-unavailable"]').text()).toBe(
      note
    );
    // No "enter a topic" invitation while AI cannot answer.
    expect(wrapper.find('[data-test="ideas-empty"]').exists()).toBe(false);
    await wrapper.find('input[type="text"]').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    expect(contentIdeasAPI.repurpose).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps "Tạo ý tưởng" usable when AI answers', async () => {
    contentIdeasAPI.repurpose.mockResolvedValue({
      data: { id: 1, topic: 'nến thơm', angles: [] },
    });
    const wrapper = await mountIdeas({ configured: true, available: true });
    expect(
      wrapper.find('[data-test="ideas-submit"]').attributes('disabled')
    ).toBeUndefined();
    expect(wrapper.find('[data-test="ideas-ai-unavailable"]').exists()).toBe(
      false
    );
    await wrapper.find('input[type="text"]').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    expect(contentIdeasAPI.repurpose).toHaveBeenCalledWith('nến thơm');
    wrapper.unmount();
  });
});
