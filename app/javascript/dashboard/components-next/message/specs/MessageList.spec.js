// Kalo UI phase 2 (task 1b-ii): subtle day separators in the message stream
// (Hôm nay / Hôm qua / dd/MM). The list is a plain <ul> (not virtualised), so the
// separator is one <li> before the first message of each day.
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import MessageList from '../MessageList.vue';

const MessageStub = {
  name: 'Message',
  props: ['id'],
  template: '<div class="message-stub" :id="\'message\' + id" />',
};

const at = iso => Math.floor(new Date(iso).getTime() / 1000);

const message = (id, iso) => ({
  id,
  message_type: 0,
  status: 'sent',
  content: `m${id}`,
  conversation_id: 1,
  created_at: at(iso),
  sender: { id: 2 },
});

const mountList = (messages, slots = {}) =>
  mount(MessageList, {
    props: { currentUserId: 1, messages },
    slots,
    global: {
      plugins: [
        createStore({ getters: { getSelectedChat: () => ({ id: 1 }) } }),
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: { Message: MessageStub },
    },
  });

const separators = wrapper =>
  wrapper.findAll('[data-test="day-separator"]').map(li => li.text());

describe('MessageList day separators', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('labels today, yesterday and older days in Vietnamese', () => {
    const wrapper = mountList([
      message(1, '2025-12-30T09:00:00'),
      message(2, '2026-11-03T09:00:00'),
      message(3, '2026-11-16T21:00:00'),
      message(4, '2026-11-17T08:00:00'),
    ]);
    expect(separators(wrapper)).toEqual([
      '30/12/2025',
      '03/11',
      'Hôm qua',
      'Hôm nay',
    ]);
  });

  it('adds one separator per day, not per message', () => {
    const wrapper = mountList([
      message(1, '2026-11-17T08:00:00'),
      message(2, '2026-11-17T08:01:00'),
      message(3, '2026-11-17T09:30:00'),
    ]);
    expect(separators(wrapper)).toEqual(['Hôm nay']);
    expect(wrapper.findAll('.message-stub')).toHaveLength(3);
  });

  it('skips a day whose messages render no bubble', () => {
    const hidden = { ...message(2, '2026-11-16T09:00:00'), content: null };
    const wrapper = mountList([
      message(1, '2026-11-15T09:00:00'),
      hidden,
      message(3, '2026-11-17T08:00:00'),
    ]);
    expect(separators(wrapper)).toEqual(['15/11', 'Hôm nay']);
  });

  it('a hidden first message of a day moves the separator to the first visible one', () => {
    const hidden = { ...message(1, '2026-11-17T07:00:00'), content: '' };
    const wrapper = mountList([hidden, message(2, '2026-11-17T08:00:00')]);
    const items = wrapper
      .findAll('li, .message-stub')
      .map(el => el.attributes('data-test') || el.attributes('id'));
    expect(items).toEqual(['message1', 'day-separator', 'message2']);
  });

  it('counts a Zalo sticker without content as visible', () => {
    const sticker = {
      ...message(1, '2026-11-17T07:00:00'),
      content: null,
      content_type: 'sticker',
      content_attributes: { sticker: { id: '5' } },
    };
    expect(separators(mountList([sticker]))).toEqual(['Hôm nay']);
  });

  it('puts the separator before the message and keeps the unread badge slot', () => {
    const wrapper = mountList(
      [message(1, '2026-11-16T08:00:00'), message(2, '2026-11-17T08:00:00')],
      { unreadBadge: '<li class="unread-badge" />' }
    );
    wrapper.setProps({ firstUnreadId: 2 });
    return wrapper.vm.$nextTick().then(() => {
      const items = wrapper
        .findAll('li, .message-stub')
        .map(el =>
          el.classes('message-stub')
            ? el.attributes('id')
            : el.attributes('data-test') || el.classes()[0]
        );
      expect(items).toEqual([
        'day-separator',
        'message1',
        'day-separator',
        'unread-badge',
        'message2',
      ]);
    });
  });

  it('collapses 2+ consecutive activity messages into a single expandable group', async () => {
    const activity = (id, text) => ({
      id,
      message_type: 2,
      status: 'sent',
      content: text,
      conversation_id: 1,
      created_at: at('2026-11-17T08:05:00') + id,
      sender: null,
    });
    const wrapper = mountList([
      message(1, '2026-11-17T08:00:00'),
      activity(2, 'John phân công chính mình'),
      activity(3, 'John thêm nhãn vip'),
      activity(4, 'John đổi mức ưu tiên'),
      message(5, '2026-11-17T08:10:00'),
    ]);

    expect(wrapper.findAll('.message-stub')).toHaveLength(2);
    const group = wrapper.find('[data-test="kalo-activity-group"]');
    expect(group.exists()).toBe(true);
    expect(group.text()).toContain('3 cập nhật hệ thống');
    expect(
      wrapper.find('[data-test="kalo-activity-group-list"]').exists()
    ).toBe(false);

    await wrapper
      .find('[data-test="kalo-activity-group-toggle"]')
      .trigger('click');
    const list = wrapper.find('[data-test="kalo-activity-group-list"]');
    expect(list.exists()).toBe(true);
    expect(list.text()).toContain('John thêm nhãn vip');
  });
});
