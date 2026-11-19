import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import CampaignWizard from '../CampaignWizard.vue';

vi.mock('dashboard/api/kchat/broadcasts', () => ({
  default: {
    audience: vi.fn(),
    preview: vi.fn(),
    checkContent: vi.fn(),
    create: vi.fn(),
    updateDraft: vi.fn(),
    results: vi.fn(),
  },
}));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { aiHealth: vi.fn(), chatReply: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const AUDIENCE = {
  audience_count: 4,
  channels: [
    {
      inbox_id: 7,
      inbox_name: 'Zalo Shop',
      channel_type: 'zalo_personal',
      requires_24h_window: false,
      read_status: false,
      rate_limit: { per_minute: 30, burst: 10 },
      eligible_count: 70,
      skipped_24h_count: 0,
      sample_name: 'Lan',
    },
    {
      inbox_id: 8,
      inbox_name: 'Fanpage',
      channel_type: 'facebook_page',
      requires_24h_window: true,
      read_status: true,
      rate_limit: null,
      eligible_count: 0,
      skipped_24h_count: 3,
    },
  ],
};

const SENT = {
  id: 'b-1',
  title: 'Ưu đãi Tết',
  status: 'processing',
  campaign_tag: 'uu_dai_tet',
  channel_type: 'zalo_personal',
};

const mountWizard = async (props = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/accounts/:accountId/campaigns',
        name: 'kalo_campaigns',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push('/app/accounts/1/campaigns');
  const store = createStore({
    getters: {
      'accounts/getAccount': () => () => ({ id: 1, name: 'Hoa Mai' }),
      'accounts/isFeatureEnabledonAccount': () => () => true,
      'globalConfig/isOnChatwootCloud': () => false,
      'customViews/getContactCustomViews': () => [{ id: 5, name: 'Khách VIP' }],
      'labels/getLabels': () => [{ id: 1, title: 'vip' }],
    },
    actions: { 'customViews/get': vi.fn(), 'labels/get': vi.fn() },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(CampaignWizard, {
    props,
    attachTo: document.body,
    global: {
      plugins: [router, store, i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
};

const find = (wrapper, test) => wrapper.find(`[data-test="${test}"]`);
const next = async wrapper => {
  await find(wrapper, 'campaign-next').trigger('click');
  await flushPromises();
};
const stepTitle = wrapper => find(wrapper, 'campaign-step-title').text();

const fillGoal = async wrapper => {
  await find(wrapper, 'campaign-title').setValue('Ưu đãi Tết');
  await wrapper.findAll('[data-test="campaign-goal"] input')[0].setValue();
};

describe('CampaignWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    broadcastsAPI.audience.mockResolvedValue({ data: AUDIENCE });
    broadcastsAPI.checkContent.mockResolvedValue({
      data: { blocked_phrases: [] },
    });
    broadcastsAPI.create.mockResolvedValue({ data: { broadcast: SENT } });
    broadcastsAPI.updateDraft.mockResolvedValue({ data: { broadcast: SENT } });
    broadcastsAPI.results.mockResolvedValue({
      data: {
        broadcast: { ...SENT, status: 'completed' },
        results: {
          eligible_count: 70,
          sent_count: 70,
          failed_count: 0,
          delivery_failed_count: 1,
          skipped_24h_count: 0,
          read_supported: false,
          read_count: null,
          replied_count: 4,
          orders_count: 2,
          revenue: 650000,
        },
      },
    });
    brandGrowthAPI.aiHealth.mockResolvedValue({ data: { configured: true } });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a progress bar with six steps and the tour anchor', async () => {
    const wrapper = await mountWizard();
    const nav = wrapper.find('[data-tour="campaign-steps"]');
    expect(nav.exists()).toBe(true);
    expect(nav.text()).toContain('Bước 1/6');
    expect(wrapper.findAll('[data-test="campaign-step-tab"]')).toHaveLength(6);
    expect(stepTitle(wrapper)).toBe('Mục tiêu');
  });

  it('blocks each step until it is complete and goes back', async () => {
    const wrapper = await mountWizard();
    await next(wrapper);
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Nhập tên chiến dịch.'
    );
    await find(wrapper, 'campaign-title').setValue('Ưu đãi Tết');
    await next(wrapper);
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Chọn mục tiêu của chiến dịch.'
    );
    await wrapper.findAll('[data-test="campaign-goal"] input')[0].setValue();
    await next(wrapper);
    expect(stepTitle(wrapper)).toBe('Khách nhận');

    await find(wrapper, 'campaign-audience-segment').find('input').setValue();
    await next(wrapper);
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Chọn một nhóm khách.'
    );

    await find(wrapper, 'campaign-back').trigger('click');
    expect(stepTitle(wrapper)).toBe('Mục tiêu');
  });

  it('shows the recipient count per channel and the Meta 24h warning', async () => {
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    expect(find(wrapper, 'campaign-audience-count').text()).toBe(
      '4 khách khớp lựa chọn'
    );
    const rows = wrapper.findAll('[data-test="campaign-reach-row"]');
    expect(rows[0].text()).toContain('70 khách');
    expect(rows[1].text()).toContain('0 khách');
    expect(find(wrapper, 'campaign-meta-warning').text()).toContain(
      '3 khách bị bỏ qua'
    );

    await find(wrapper, 'campaign-audience-labels').find('input').setValue();
    await wrapper.find('[data-test="campaign-label"]').trigger('click');
    await flushPromises();
    expect(broadcastsAPI.audience).toHaveBeenLastCalledWith({
      labels: 'vip',
      segment_id: undefined,
    });
  });

  it('blocks content with banned phrases from the backend check', async () => {
    broadcastsAPI.checkContent.mockResolvedValue({
      data: { blocked_phrases: ['tốt nhất thế giới'] },
    });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    expect(stepTitle(wrapper)).toBe('Nội dung');
    await find(wrapper, 'campaign-message').setValue('Nến tốt nhất thế giới');
    await next(wrapper);
    expect(broadcastsAPI.checkContent).toHaveBeenCalledWith(
      'Nến tốt nhất thế giới'
    );
    expect(find(wrapper, 'campaign-banned').text()).toContain(
      'tốt nhất thế giới'
    );
    expect(stepTitle(wrapper)).toBe('Nội dung');
  });

  it('writes with AI through the brand chat endpoint', async () => {
    brandGrowthAPI.chatReply.mockResolvedValue({
      data: {
        reply: 'Chào {{name}}, Tết này shop giảm 20%!',
        guardrail_triggered: true,
      },
    });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-ai-write').trigger('click');
    await flushPromises();
    const [[call]] = brandGrowthAPI.chatReply.mock.calls;
    expect(call.history).toEqual([]);
    expect(call.message).toContain('Bán hàng');
    expect(call.message).toContain('Ưu đãi Tết');
    expect(call.message).toContain('Hoa Mai');
    expect(find(wrapper, 'campaign-message').element.value).toBe(
      'Chào {{name}}, Tết này shop giảm 20%!'
    );
    expect(find(wrapper, 'campaign-ai-guardrail').exists()).toBe(true);
    expect(
      wrapper.find('[data-test="campaign-preview-bubble"]').text()
    ).toContain('Chào Lan, Tết này shop giảm 20%!');
  });

  it('hides the AI button when AI is not configured', async () => {
    brandGrowthAPI.aiHealth.mockResolvedValue({ data: { configured: false } });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    expect(find(wrapper, 'campaign-ai-write').exists()).toBe(false);
  });

  it('replaces the AI button with a note while the AI provider is failing', async () => {
    brandGrowthAPI.aiHealth.mockResolvedValue({
      data: { configured: true, available: false },
    });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    expect(find(wrapper, 'campaign-ai-write').exists()).toBe(false);
    expect(find(wrapper, 'campaign-ai-unavailable').text()).toBe(
      'AI đang lỗi kết nối nên tạm chưa viết hộ được. Bạn vẫn soạn tay bình thường, vài phút nữa thử lại.'
    );
  });

  it('builds a UTM link with the campaign tag and inserts it', async () => {
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Xem ngay:');
    await find(wrapper, 'campaign-utm-url').setValue('hoamai.vn/nen');
    const link =
      'https://hoamai.vn/nen?utm_source=kalo&utm_medium=broadcast&utm_campaign=uu_dai_tet';
    expect(find(wrapper, 'campaign-utm-link').text()).toBe(link);
    await find(wrapper, 'campaign-utm-insert').trigger('click');
    expect(find(wrapper, 'campaign-message').element.value).toBe(
      `Xem ngay:\n${link}`
    );
  });

  it('sends the full payload, estimates Zalo time and shows results', async () => {
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Chào {{name}}');
    await next(wrapper);
    expect(stepTitle(wrapper)).toBe('Kênh và lịch');
    const channels = wrapper.findAll('[data-test="campaign-channel"]');
    expect(channels[0].find('input').element.checked).toBe(true);
    expect(channels[1].find('input').element.disabled).toBe(true);
    expect(find(wrapper, 'campaign-channel-rate').exists()).toBe(true);
    await next(wrapper);

    expect(stepTitle(wrapper)).toBe('Xem lại và gửi');
    // {{name}} is filled like the backend does for the first recipient.
    expect(find(wrapper, 'campaign-review-message').text()).toBe('Chào Lan');
    expect(find(wrapper, 'campaign-review-sample').text()).toContain('Lan');
    expect(find(wrapper, 'campaign-review-recipients').text()).toBe('70');
    expect(find(wrapper, 'campaign-review-duration').text()).toBe(
      'Khoảng 2 phút'
    );
    expect(find(wrapper, 'campaign-next').text()).toContain('Gửi cho 70 khách');
    await next(wrapper);
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Đánh dấu xác nhận trước khi gửi.'
    );
    expect(broadcastsAPI.create).not.toHaveBeenCalled();

    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(broadcastsAPI.create).toHaveBeenCalledWith({
      title: 'Ưu đãi Tết',
      goal: 'sales',
      campaign_tag: 'uu_dai_tet',
      labels: [],
      segment_id: null,
      message: 'Chào {{name}}',
      inbox_id: 7,
      scheduled_at: null,
      only_24h: false,
      draft: false,
    });
    expect(wrapper.emitted('saved')[0][0]).toEqual(SENT);
    expect(stepTitle(wrapper)).toBe('Kết quả');
    expect(find(wrapper, 'campaign-result-sent').text()).toContain('69');
    expect(find(wrapper, 'campaign-result-failed_count').text()).toContain('1');
    expect(find(wrapper, 'campaign-result-read').exists()).toBe(false);
    expect(find(wrapper, 'campaign-results-no-read').text()).toContain(
      'Zalo cá nhân'
    );
  });

  it('schedules in Vietnam time and refuses a past time', async () => {
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Hi');
    await next(wrapper);
    await find(wrapper, 'campaign-when-later').find('input').trigger('change');
    await find(wrapper, 'campaign-scheduled-at').setValue('2020-01-01T09:00');
    await next(wrapper);
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Giờ hẹn phải ở tương lai.'
    );
    await find(wrapper, 'campaign-scheduled-at').setValue('2099-01-01T09:00');
    await next(wrapper);
    await find(wrapper, 'campaign-confirm').setValue(true);
    expect(find(wrapper, 'campaign-next').text()).toContain('Hẹn gửi cho 70');
    await next(wrapper);
    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_at: '2099-01-01T09:00:00+07:00' })
    );
  });

  it('saves a draft from any step and updates it afterwards', async () => {
    broadcastsAPI.create.mockResolvedValue({
      data: { broadcast: { id: 'd-1', title: 'Ưu đãi Tết', status: 'draft' } },
    });
    const wrapper = await mountWizard();
    await find(wrapper, 'campaign-save-draft').trigger('click');
    await flushPromises();
    expect(find(wrapper, 'campaign-step-error').text()).toBe(
      'Nhập tên chiến dịch.'
    );
    expect(broadcastsAPI.create).not.toHaveBeenCalled();

    await fillGoal(wrapper);
    await find(wrapper, 'campaign-save-draft').trigger('click');
    await flushPromises();
    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ưu đãi Tết',
        goal: 'sales',
        draft: true,
      })
    );

    await next(wrapper);
    await find(wrapper, 'campaign-save-draft').trigger('click');
    await flushPromises();
    expect(broadcastsAPI.updateDraft).toHaveBeenCalledWith(
      'd-1',
      expect.objectContaining({ draft: true })
    );
  });

  it('continues a saved draft and sends it with PATCH', async () => {
    const wrapper = await mountWizard({
      draft: {
        id: 'd-9',
        title: 'Nháp cũ',
        goal: 'retention',
        status: 'draft',
        message: 'Chào {{name}}',
        inbox_id: 7,
        labels: [],
      },
    });
    expect(find(wrapper, 'campaign-title').element.value).toBe('Nháp cũ');
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await next(wrapper);
    }
    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(broadcastsAPI.updateDraft).toHaveBeenCalledWith(
      'd-9',
      expect.objectContaining({ draft: false, inbox_id: 7, goal: 'retention' })
    );
    expect(broadcastsAPI.create).not.toHaveBeenCalled();
  });

  it('explains an expired trial when sending', async () => {
    broadcastsAPI.create.mockRejectedValue({
      response: { status: 403, data: { error: 'subscription_expired' } },
    });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Hi');
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(find(wrapper, 'campaign-action-error').text()).toContain(
      'Gói dùng thử đã hết hạn'
    );
    expect(stepTitle(wrapper)).toBe('Xem lại và gửi');
  });

  const toReview = async wrapper => {
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Chào {{name}}');
    await next(wrapper);
  };

  it('keeps the tag unique among saved campaigns and shows it on review', async () => {
    const wrapper = await mountWizard({
      existingCampaigns: [{ id: 'x', campaign_tag: 'uu_dai_tet' }],
    });
    await toReview(wrapper);
    await next(wrapper);
    expect(find(wrapper, 'campaign-review-tag').text()).toBe('uu_dai_tet-2');
    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_tag: 'uu_dai_tet-2' })
    );
  });

  it('locks the tag once a UTM link is in the message', async () => {
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-utm-url').setValue('hoamai.vn');
    await find(wrapper, 'campaign-utm-insert').trigger('click');
    expect(find(wrapper, 'campaign-tag-locked').text()).toContain('uu_dai_tet');
    await find(wrapper, 'campaign-back').trigger('click');
    await find(wrapper, 'campaign-back').trigger('click');
    await find(wrapper, 'campaign-title').setValue('Tên khác hẳn');
    await find(wrapper, 'campaign-save-draft').trigger('click');
    await flushPromises();
    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tên khác hẳn',
        campaign_tag: 'uu_dai_tet',
      })
    );
  });

  it('offers the 24h option on Zalo and counts recipients with it', async () => {
    broadcastsAPI.preview.mockResolvedValue({
      data: { inbox_id: 7, eligible_count: 12, skipped_24h_count: 58 },
    });
    const wrapper = await mountWizard();
    await fillGoal(wrapper);
    await next(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-message').setValue('Hi');
    await next(wrapper);
    await find(wrapper, 'campaign-only-24h').find('input').setValue(true);
    await flushPromises();
    expect(broadcastsAPI.preview).toHaveBeenCalledWith(
      expect.objectContaining({ inbox_id: 7, only_24h: true })
    );
    await next(wrapper);
    expect(find(wrapper, 'campaign-review-recipients').text()).toBe('12');
    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(broadcastsAPI.create).toHaveBeenCalledWith(
      expect.objectContaining({ only_24h: true, inbox_id: 7 })
    );
  });

  it('translates backend error codes', async () => {
    broadcastsAPI.create.mockRejectedValue({
      response: { status: 422, data: { error: 'broadcast_limit_reached' } },
    });
    const wrapper = await mountWizard();
    await toReview(wrapper);
    await next(wrapper);
    await find(wrapper, 'campaign-confirm').setValue(true);
    await next(wrapper);
    expect(find(wrapper, 'campaign-action-error').text()).toContain(
      'Đã đủ 30 chiến dịch'
    );
  });
});
