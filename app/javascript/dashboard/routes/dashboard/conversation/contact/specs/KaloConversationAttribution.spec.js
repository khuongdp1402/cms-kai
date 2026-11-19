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

  it('shows the Kalo campaign that reached the conversation next to the ad UTM', () => {
    const wrapper = mount(KaloConversationAttribution, {
      props: {
        conversation: {
          id: 7,
          additional_attributes: {
            utm_source: 'facebook_ads',
            utm_campaign: 'tet_2027',
            kchat_broadcast_tag: 'ra_mat_nen',
            kchat_campaign_at: '2026-11-16T03:05:00Z',
          },
        },
      },
      global: { plugins: [i18n] },
    });

    const chips = wrapper.find('[data-test="utm-chips"]').text();
    expect(chips).toContain('facebook_ads');
    expect(chips).toContain('tet_2027');
    const broadcast = wrapper.find('[data-test="broadcast-chip"]');
    expect(broadcast.text()).toContain('Chiến dịch');
    expect(broadcast.text()).toContain('ra_mat_nen');
    expect(broadcast.text()).toMatch(/\d{2}:\d{2} 16\/11\/2026/);
    expect(wrapper.text()).not.toContain(
      viMessages.KALO_CHAT.ATTRIBUTION.EMPTY
    );
  });

  it('shows only the campaign when the conversation has no UTM', () => {
    const wrapper = mount(KaloConversationAttribution, {
      props: {
        conversation: {
          id: 8,
          additional_attributes: { kchat_broadcast_tag: 'cham_khach' },
        },
      },
      global: { plugins: [i18n] },
    });

    expect(wrapper.find('[data-test="broadcast-chip"]').text()).toContain(
      'cham_khach'
    );
    expect(wrapper.text()).not.toContain(
      viMessages.KALO_CHAT.ATTRIBUTION.EMPTY
    );
  });
});
