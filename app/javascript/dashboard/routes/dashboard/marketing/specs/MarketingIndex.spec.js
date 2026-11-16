import { mount, flushPromises } from '@vue/test-utils';
import MarketingIndex from '../MarketingIndex.vue';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';

vi.mock('dashboard/api/kchat/contentIdeas', () => ({
  default: { repurpose: vi.fn(), decide: vi.fn() },
}));

const job = {
  id: 11,
  topic: 'nến thơm',
  status: 'pending',
  angles: [
    { angle: 'Câu chuyện', hook: 'Hook A', body: 'Body A', cta: 'Nhắn Zalo' },
    { angle: 'Mẹo dùng', hook: 'Hook B', body: 'Body B', cta: 'Đặt ngay' },
    { angle: 'Quà tặng', hook: 'Hook C', body: 'Body C', cta: 'Chọn quà' },
  ],
};

const mountPage = async () => {
  const get = vi.fn();
  const { plugins, router, store } = createPageTestEnv({
    modules: {
      campaigns: { namespaced: true, actions: { get } },
      labels: { namespaced: true, actions: { get: vi.fn() } },
    },
  });
  await router.push({ name: 'kalo_orders', params: { accountId: 1 } });
  const wrapper = mount(MarketingIndex, {
    global: {
      plugins,
      stubs: {
        LiveChatCampaignsPage: { template: '<div data-test="campaigns" />' },
      },
    },
  });
  await flushPromises();
  return { wrapper, store, get };
};

const tab = (wrapper, label) =>
  wrapper.findAll('[role="tab"]').find(t => t.text() === label);

describe('MarketingIndex', () => {
  beforeEach(() => {
    contentIdeasAPI.repurpose.mockReset();
    contentIdeasAPI.decide.mockReset();
  });

  it('tab Chiến dịch renders the existing campaigns list; tab Ý tưởng nội dung submits the topic and lists three angles with Duyệt and Bỏ qua buttons', async () => {
    contentIdeasAPI.repurpose.mockResolvedValue({ data: job });
    contentIdeasAPI.decide.mockResolvedValue({ data: {} });
    const { wrapper, get } = await mountPage();
    expect(get).toHaveBeenCalled();
    expect(wrapper.find('[data-test="campaigns"]').exists()).toBe(true);

    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    expect(wrapper.find('[data-test="campaigns"]').exists()).toBe(false);
    await wrapper.find('input').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(contentIdeasAPI.repurpose).toHaveBeenCalledWith('nến thơm');

    const cards = wrapper.findAll('[data-test="angle"]');
    expect(cards).toHaveLength(3);
    expect(cards[0].text()).toContain('Hook A');
    const approve = cards[0].findAll('button').find(b => b.text() === 'Duyệt');
    const skip = cards[1].findAll('button').find(b => b.text() === 'Bỏ qua');
    expect(approve).toBeTruthy();
    expect(skip).toBeTruthy();

    await approve.trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.decide).toHaveBeenCalledWith(11, 'approve');
    await skip.trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.decide).toHaveBeenCalledWith(11, 'reject');
  });

  it('AI not configured shows one sentence, not an error trace', async () => {
    contentIdeasAPI.repurpose.mockRejectedValue({
      response: { status: 503, data: { error: 'ai_not_configured' } },
    });
    const { wrapper } = await mountPage();
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await wrapper.find('input').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const notice = wrapper.find('[data-test="notice"]');
    expect(notice.text()).toBe(
      'Gợi ý nội dung chưa được bật cho cửa hàng của bạn.'
    );
    expect(wrapper.text()).not.toContain('ai_not_configured');
  });

  it('subscription_expired shows a renew prompt linking to billing', async () => {
    contentIdeasAPI.repurpose.mockRejectedValue({
      response: { status: 403, data: { error: 'subscription_expired' } },
    });
    const { wrapper } = await mountPage();
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await wrapper.find('input').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const link = wrapper.find('[data-test="renew-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toContain('kalo_billing');
  });
});
