import { mount, flushPromises } from '@vue/test-utils';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import BrandProfileForm from '../BrandProfileForm.vue';
import { createPageTestEnv } from '../../reports/specs/kaloPageTestEnv';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/kchat/contentIdeas', () => ({
  default: { overview: vi.fn(), saveProfile: vi.fn() },
}));

const mountForm = async ai => {
  contentIdeasAPI.overview.mockResolvedValue({
    data: { brand_profile: {}, ai },
  });
  const wrapper = mount(BrandProfileForm, {
    global: { plugins: createPageTestEnv().plugins },
  });
  await flushPromises();
  return wrapper.find('[data-test="brand-ai-status"]');
};

// The badge reads GET brand_growth overview `ai` (Ai::CustomLlmService#health_status).
describe('BrandProfileForm AI badge', () => {
  it('names the model once, without "(AI)" duplication', async () => {
    const badge = await mountForm({
      configured: true,
      available: true,
      chat_model: 'agentgw-gpt-5.5',
    });
    expect(badge.text()).toBe('AI đang hoạt động · agentgw-gpt-5.5');
    expect(
      (await mountForm({ configured: true, available: true })).text()
    ).toBe('AI đang hoạt động');
  });

  it('says AI is not answering when configured but failing', async () => {
    const badge = await mountForm({
      configured: true,
      available: false,
      chat_model: 'agentgw-gpt-5.5',
    });
    expect(badge.text()).toBe('AI tạm thời không phản hồi');
    expect(badge.text()).not.toContain('hoạt động');
  });

  it('says AI is off when not configured', async () => {
    const badge = await mountForm({ configured: false, available: false });
    expect(badge.text()).toBe('AI chưa được cấu hình cho cửa hàng này');
  });
});
