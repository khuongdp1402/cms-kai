import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloConversationAttribution from '../KaloConversationAttribution.vue';
import conversationAttributionAPI from 'dashboard/api/kchat/conversationAttribution';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/conversationAttribution', () => ({
  default: { update: vi.fn() },
}));

describe('KaloConversationAttribution', () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });

  beforeEach(() => {
    alertMock.mockReset();
    conversationAttributionAPI.update.mockReset();
  });

  it('displays social comment badge and updates UTM attribution', async () => {
    conversationAttributionAPI.update.mockResolvedValue({
      data: { utm_source: 'tiktok_ads', utm_campaign: 'flash_11' },
    });
    const wrapper = mount(KaloConversationAttribution, {
      props: {
        conversation: {
          id: 42,
          additional_attributes: {
            source_type: 'social_comment',
            platform: 'facebook',
            private_reply_sent: true,
            utm_source: 'facebook',
            utm_campaign: 'post_1',
          },
        },
      },
      global: { plugins: [i18n] },
    });

    expect(wrapper.find('[data-test="social-comment-badge"]').text()).toContain(
      'facebook'
    );
    expect(wrapper.find('[data-test="utm-chips"]').text()).toContain('post_1');

    await wrapper.find('[data-test="attribution-edit-btn"]').trigger('click');
    await wrapper.find('[data-test="utm-source-input"]').setValue('tiktok_ads');
    await wrapper.find('[data-test="utm-campaign-input"]').setValue('flash_11');
    await wrapper.find('[data-test="attribution-form"]').trigger('submit');
    await flushPromises();

    expect(conversationAttributionAPI.update).toHaveBeenCalledWith(42, {
      utm_source: 'tiktok_ads',
      utm_campaign: 'flash_11',
      sync_label: true,
    });
    expect(wrapper.find('[data-test="utm-chips"]').text()).toContain(
      'flash_11'
    );
    expect(alertMock).toHaveBeenCalled();
  });
});
