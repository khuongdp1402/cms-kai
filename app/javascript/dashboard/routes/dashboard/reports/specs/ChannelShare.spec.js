import { mount } from '@vue/test-utils';
import ChannelShare from '../ChannelShare.vue';
import { createPageTestEnv } from './kaloPageTestEnv';

const render = channels =>
  mount(ChannelShare, {
    props: { channels },
    global: { plugins: createPageTestEnv().plugins },
  });

describe('ChannelShare', () => {
  it('labels an unknown channel Khác instead of the raw key', () => {
    const wrapper = render([
      { channel: 'Channel::Mystery', orders: 1, share_pct: 100 },
    ]);
    expect(wrapper.text()).toContain('Khác');
    expect(wrapper.text()).not.toContain('Mystery');
  });

  // Real strings from Kchat::Reports#channels: channel_type.demodulize.underscore
  // for every app/models/channel/*.rb model, or the order source.
  it.each([
    ['web_widget', 'Website'],
    ['facebook_page', 'Facebook'],
    ['twilio_sms', 'SMS'],
    ['twitter_profile', 'Twitter'],
    ['zalo_personal', 'Zalo'],
    ['whatsapp', 'WhatsApp'],
    ['sms', 'SMS'],
    ['email', 'Email'],
    ['instagram', 'Instagram'],
    ['telegram', 'Telegram'],
    ['line', 'Line'],
    ['tiktok', 'TikTok'],
    ['api', 'Khác'],
    ['chat', 'Chat (hội thoại đã xóa)'],
    ['pos', 'Tại quầy'],
    ['manual', 'Tạo tay'],
  ])('shows %s as %s', (channel, label) => {
    const wrapper = render([{ channel, orders: 1, share_pct: 100 }]);
    expect(wrapper.text()).toContain(label);
    expect(wrapper.text()).not.toContain(channel);
  });

  it('keeps two values with the same label as separate rows', () => {
    const wrapper = render([
      { channel: 'sms', orders: 1, share_pct: 50 },
      { channel: 'twilio_sms', orders: 1, share_pct: 50 },
    ]);
    expect(wrapper.findAll('[data-test="channel"]')).toHaveLength(2);
  });
});
