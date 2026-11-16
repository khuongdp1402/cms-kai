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

const mountPage = async (role = 'administrator') => {
  const get = vi.fn();
  const { plugins, router, store } = createPageTestEnv({
    role,
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

  it('keeps SMS and WhatsApp campaigns reachable under the Chiến dịch tab', async () => {
    const { wrapper } = await mountPage();
    const hrefs = wrapper
      .findAll('[data-test="campaign-link"]')
      .map(l => l.attributes('href'));
    expect(hrefs.some(h => h.includes('campaigns_sms_index'))).toBe(true);
    expect(hrefs.some(h => h.includes('campaigns_whatsapp_index'))).toBe(true);
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    expect(wrapper.find('[data-test="campaign-link"]').exists()).toBe(false);
  });

  it('rejects an empty topic without calling the API', async () => {
    const { wrapper } = await mountPage();
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await wrapper.find('input').setValue('   ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(contentIdeasAPI.repurpose).not.toHaveBeenCalled();
  });

  const openIdeas = async () => {
    contentIdeasAPI.repurpose.mockResolvedValue({ data: job });
    const ctx = await mountPage();
    await tab(ctx.wrapper, 'Ý tưởng nội dung').trigger('click');
    await ctx.wrapper.find('input').setValue('nến thơm');
    await ctx.wrapper.find('form').trigger('submit');
    await flushPromises();
    return ctx.wrapper;
  };
  const button = (wrapper, label, i = 0) =>
    wrapper
      .findAll('[data-test="angle"]')
      [i].findAll('button')
      .find(b => b.text() === label);

  it('double-clicking Duyệt calls approve once and disables both buttons meanwhile', async () => {
    let finish;
    contentIdeasAPI.decide.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = await openIdeas();
    await button(wrapper, 'Duyệt').trigger('click');
    await button(wrapper, 'Duyệt').trigger('click');
    expect(contentIdeasAPI.decide).toHaveBeenCalledTimes(1);
    expect(button(wrapper, 'Duyệt').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Bỏ qua').attributes('disabled')).toBeDefined();
    finish({ data: {} });
    await flushPromises();
    expect(wrapper.findAll('[data-test="angle"]')[0].text()).toContain(
      'Đã duyệt'
    );
  });

  it('shows a friendly sentence when saving the choice fails and re-enables the buttons', async () => {
    contentIdeasAPI.decide.mockRejectedValue({ response: { status: 500 } });
    const wrapper = await openIdeas();
    await button(wrapper, 'Duyệt').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="notice"]').text()).toBe(
      'Chưa lưu được lựa chọn. Thử lại sau ít phút.'
    );
    expect(button(wrapper, 'Duyệt').attributes('disabled')).toBeUndefined();
    expect(button(wrapper, 'Bỏ qua').attributes('disabled')).toBeUndefined();
  });

  it('shows agents a sentence asking an administrator to renew instead of the link', async () => {
    contentIdeasAPI.repurpose.mockRejectedValue({
      response: { status: 403, data: { error: 'subscription_expired' } },
    });
    const { wrapper } = await mountPage('agent');
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await wrapper.find('input').setValue('nến thơm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[data-test="renew-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="renew-ask-admin"]').text()).toBe(
      'Hãy nhờ quản trị viên gia hạn.'
    );
  });
});
