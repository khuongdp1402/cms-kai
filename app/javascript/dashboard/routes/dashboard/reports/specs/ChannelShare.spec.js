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

  it('maps inbox channel types to readable labels', () => {
    const wrapper = render([
      { channel: 'Channel::Whatsapp', orders: 2, share_pct: 50 },
      { channel: 'Channel::WebWidget', orders: 2, share_pct: 50 },
    ]);
    expect(wrapper.text()).toContain('WhatsApp');
    expect(wrapper.text()).toContain('Website');
  });
});
