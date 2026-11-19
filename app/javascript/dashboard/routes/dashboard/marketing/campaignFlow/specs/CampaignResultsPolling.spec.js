import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import CampaignResults from '../CampaignResults.vue';
import { RESULTS_POLL_MS as POLL_INTERVAL_MS } from '../campaignFlowHelpers';

vi.mock('dashboard/api/kchat/broadcasts', () => ({
  default: { results: vi.fn() },
}));

const payload = status => ({
  data: {
    broadcast: {
      id: 'c',
      title: 'Ra mắt nến',
      status,
      channel_type: 'zalo_personal',
      requires_24h_window: false,
      campaign_tag: 'ra_mat_nen',
    },
    results: {
      eligible_count: 10,
      sent_count: status === 'completed' ? 10 : 4,
      failed_count: 0,
      delivery_failed_count: 0,
      skipped_24h_count: 0,
      read_supported: false,
      read_count: 0,
      replied_count: 0,
      orders_count: 0,
      revenue: 0,
      attribution_days: 7,
    },
  },
});

const mountResults = () =>
  mount(CampaignResults, {
    props: { broadcastId: 'c' },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
  });

const status = wrapper =>
  wrapper.find('[data-test="campaign-results-status"]').text();

describe('CampaignResults polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('polls every few seconds while sending and stops once the campaign is done', async () => {
    expect(POLL_INTERVAL_MS).toBeGreaterThanOrEqual(3000);
    expect(POLL_INTERVAL_MS).toBeLessThanOrEqual(5000);
    broadcastsAPI.results
      .mockResolvedValueOnce(payload('processing'))
      .mockResolvedValueOnce(payload('sending'))
      .mockResolvedValueOnce(payload('completed'));
    const wrapper = mountResults();
    await flushPromises();
    expect(status(wrapper)).toBe('Đang gửi');
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(2);
    expect(status(wrapper)).toBe('Đang gửi');
    // The numbers stay on screen while refreshing in the background.
    expect(wrapper.find('[data-test="campaign-results-tiles"]').exists()).toBe(
      true
    );

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(3);
    expect(status(wrapper)).not.toBe('Đang gửi');
    expect(wrapper.find('[data-test="campaign-result-sent"]').text()).toContain(
      '10'
    );

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(3);
  });

  it('stops polling when the drawer closes (component unmounted)', async () => {
    broadcastsAPI.results.mockResolvedValue(payload('sending'));
    const wrapper = mountResults();
    await flushPromises();
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(1);
  });

  it('does not poll a completed or scheduled campaign', async () => {
    broadcastsAPI.results.mockResolvedValue(payload('scheduled'));
    mountResults();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after a failed refresh while sending', async () => {
    broadcastsAPI.results
      .mockResolvedValueOnce(payload('sending'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(payload('completed'));
    const wrapper = mountResults();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(status(wrapper)).toBe('Đang gửi');
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(3);
    expect(status(wrapper)).not.toBe('Đang gửi');
  });
});
