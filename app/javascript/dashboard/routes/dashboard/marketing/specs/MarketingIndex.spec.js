import { mount, flushPromises } from '@vue/test-utils';
import MarketingIndex from '../MarketingIndex.vue';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import commentRulesAPI from 'dashboard/api/kchat/commentRules';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/contentIdeas', () => ({
  default: {
    overview: vi.fn(),
    saveProfile: vi.fn(),
    repurpose: vi.fn(),
    decide: vi.fn(),
    updateAngle: vi.fn(),
    saveCalendarItem: vi.fn(),
    deleteCalendarItem: vi.fn(),
  },
}));
vi.mock('dashboard/api/kchat/broadcasts', () => ({
  default: {
    list: vi.fn(),
    preview: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('dashboard/api/kchat/commentRules', () => ({
  default: {
    get: vi.fn(),
    update: vi.fn(),
  },
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
      labels: {
        namespaced: true,
        getters: { getLabels: () => [{ title: 'vip' }] },
        actions: { get: vi.fn() },
      },
      inboxes: {
        namespaced: true,
        getters: {
          getInboxes: () => [
            {
              id: 10,
              name: 'Zalo Shop',
              channel_type: 'Channel::ZaloPersonal',
            },
          ],
        },
        actions: { get: vi.fn() },
      },
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
    alertMock.mockReset();
    contentIdeasAPI.overview.mockReset();
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        brand_profile: {},
        ai: { configured: true, default_model: 'gpt-5' },
        jobs: [],
        calendar: [],
      },
    });
    contentIdeasAPI.saveProfile.mockReset();
    contentIdeasAPI.repurpose.mockReset();
    contentIdeasAPI.decide.mockReset();
    contentIdeasAPI.updateAngle.mockReset();
    contentIdeasAPI.saveCalendarItem.mockReset();
    contentIdeasAPI.deleteCalendarItem.mockReset();
    broadcastsAPI.list.mockReset();
    broadcastsAPI.list.mockResolvedValue({ data: { broadcasts: [] } });
    broadcastsAPI.preview.mockReset();
    broadcastsAPI.preview.mockResolvedValue({
      data: {
        eligible_count: 5,
        skipped_24h_count: 0,
        requires_24h_window: false,
      },
    });
    broadcastsAPI.create.mockReset();
    commentRulesAPI.get.mockReset();
    commentRulesAPI.get.mockResolvedValue({
      data: {
        rules: {
          enabled: true,
          auto_hide_phone: true,
          hide_keywords: ['sỉ'],
          auto_private_reply: false,
          private_reply_template: 'Chào {{name}}',
        },
      },
    });
    commentRulesAPI.update.mockReset();
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
    expect(contentIdeasAPI.decide).toHaveBeenCalledWith(11, 'approve', 0);
    await skip.trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.decide).toHaveBeenCalledWith(11, 'reject', 1);
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

  it('loads saved idea history from overview and lets the user switch topics', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        brand_profile: {},
        ai: { configured: false },
        jobs: [
          job,
          {
            id: 12,
            topic: 'quà 20/10',
            status: 'pending',
            angles: [
              {
                angle: 'Tặng mẹ',
                hook: 'Hook Q1',
                body: 'Body Q1',
                cta: 'Inbox',
                status: 'approved',
              },
            ],
          },
        ],
      },
    });
    const { wrapper } = await mountPage();
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await flushPromises();

    const historyBtns = wrapper.findAll('[data-test="history-topic"]');
    expect(historyBtns).toHaveLength(2);
    expect(wrapper.text()).toContain('Hook A');

    await historyBtns[1].trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Hook Q1');
    expect(wrapper.text()).toContain('Đã duyệt');
  });

  it('brand profile tab loads existing profile, saves for admin, and locks inputs for agent', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        brand_profile: {
          brand_name: 'Kalo Candles',
          positioning: 'Nến sạch',
          hard_bans: ['rẻ nhất', '100%'],
        },
        ai: { configured: true, default_model: 'kalo-ai' },
        jobs: [],
      },
    });
    contentIdeasAPI.saveProfile.mockResolvedValue({ data: {} });

    const { wrapper } = await mountPage('administrator');
    await tab(wrapper, 'Hồ sơ thương hiệu').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="brand-ai-status"]').text()).toContain(
      'kalo-ai'
    );
    expect(wrapper.find('[data-test="brand-name"]').element.value).toBe(
      'Kalo Candles'
    );
    expect(wrapper.find('[data-test="brand-hard-bans"]').element.value).toBe(
      'rẻ nhất, 100%'
    );

    await wrapper.find('[data-test="brand-name"]').setValue('Kalo Studio');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(contentIdeasAPI.saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ brand_name: 'Kalo Studio' })
    );
    expect(alertMock).toHaveBeenCalledWith('Đã lưu hồ sơ thương hiệu');

    const agentView = await mountPage('agent');
    await tab(agentView.wrapper, 'Hồ sơ thương hiệu').trigger('click');
    await flushPromises();
    expect(
      agentView.wrapper.find('[data-test="brand-name"]').attributes('disabled')
    ).toBeDefined();
    expect(agentView.wrapper.find('[data-test="brand-save"]').exists()).toBe(
      false
    );
  });

  it('edits an angle script inline and schedules it onto Content Calendar', async () => {
    const updatedJob = {
      ...job,
      angles: [
        { ...job.angles[0], hook: 'Hook Mới' },
        job.angles[1],
        job.angles[2],
      ],
    };
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        brand_profile: {},
        ai: { configured: true },
        jobs: [job],
        calendar: [],
      },
    });
    contentIdeasAPI.updateAngle.mockResolvedValue({ data: updatedJob });
    contentIdeasAPI.saveCalendarItem.mockResolvedValue({
      data: { item: { id: 'cal-1', title: 'nến thơm — Câu chuyện' } },
    });

    const { wrapper } = await mountPage();
    await tab(wrapper, 'Ý tưởng nội dung').trigger('click');
    await flushPromises();

    await wrapper.find('[data-test="edit-angle"]').trigger('click');
    await wrapper.find('[data-test="edit-hook-input"]').setValue('Hook Mới');
    await wrapper.find('[data-test="save-angle-edit"]').trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.updateAngle).toHaveBeenCalledWith(11, 0, {
      hook: 'Hook Mới',
      body: 'Body A',
      cta: 'Nhắn Zalo',
    });

    await wrapper.find('[data-test="schedule-angle"]').trigger('click');
    await wrapper.find('[data-test="confirm-schedule-angle"]').trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.saveCalendarItem).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'tiktok',
        status: 'scheduled',
        source_job_id: 11,
      })
    );
  });

  it('manages Content Calendar items and Comment Automation rules', async () => {
    contentIdeasAPI.overview.mockResolvedValue({
      data: {
        brand_profile: {},
        ai: { configured: true },
        jobs: [],
        calendar: [
          {
            id: 'c1',
            title: 'Bài Tết 2027',
            channel: 'facebook',
            status: 'scheduled',
            scheduled_for: '2026-12-01',
          },
        ],
      },
    });
    contentIdeasAPI.deleteCalendarItem.mockResolvedValue({
      data: { deleted: 'c1' },
    });
    commentRulesAPI.update.mockResolvedValue({ data: {} });

    const { wrapper } = await mountPage();
    await tab(wrapper, 'Lịch nội dung').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-test="calendar-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Bài Tết 2027');

    await wrapper.find('[data-test="calendar-delete"]').trigger('click');
    await flushPromises();
    expect(contentIdeasAPI.deleteCalendarItem).toHaveBeenCalledWith('c1');

    await tab(wrapper, 'Bình luận FB/IG').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="rules-private-reply"]').setValue(true);
    await wrapper.find('[data-test="comment-rules-form"]').trigger('submit');
    await flushPromises();
    expect(commentRulesAPI.update).toHaveBeenCalledWith(
      expect.objectContaining({ auto_private_reply: true })
    );
  });

  it('creates an omnichannel broadcast with audience preview on Chiến dịch tab', async () => {
    broadcastsAPI.create.mockResolvedValue({
      data: {
        broadcast: {
          id: 'b1',
          title: 'Sale Tết',
          inbox_name: 'Zalo Shop',
          status: 'processing',
          eligible_count: 5,
          sent_count: 0,
          skipped_24h_count: 0,
        },
      },
    });

    const { wrapper } = await mountPage();
    await wrapper.find('[data-test="broadcast-toggle"]').trigger('click');
    await flushPromises();
    expect(broadcastsAPI.preview).toHaveBeenCalled();

    await wrapper.find('[data-test="broadcast-label"]').trigger('click');
    await wrapper.find('[data-test="broadcast-title"]').setValue('Sale Tết');
    await wrapper
      .find('[data-test="broadcast-message"]')
      .setValue('Chào {{name}}, ưu đãi 20%');
    await wrapper.find('[data-test="broadcast-form"]').trigger('submit');
    await flushPromises();

    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sale Tết',
        inbox_id: 10,
        labels: ['vip'],
      })
    );
    expect(wrapper.find('[data-test="broadcast-item"]').text()).toContain(
      'Sale Tết'
    );
  });

  it('leaves drafts to the Chiến dịch page and links to it', async () => {
    broadcastsAPI.list.mockResolvedValue({
      data: {
        broadcasts: [
          { id: 'd', title: 'Nháp', status: 'draft' },
          {
            id: 's',
            title: 'Đang chạy',
            status: 'sending',
            inbox_name: 'Zalo Shop',
          },
        ],
      },
    });
    const { wrapper } = await mountPage();
    const items = wrapper.findAll('[data-test="broadcast-item"]');
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain('Đang gửi');
    expect(
      wrapper.find('[data-test="broadcast-open-campaigns"]').exists()
    ).toBe(true);
  });
});
