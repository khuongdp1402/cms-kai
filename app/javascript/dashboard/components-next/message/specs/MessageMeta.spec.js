// Kalo UI phase 2 (task 1b-ii), C-49: message meta shows HH:mm (the day lives in the
// day separator), reveals the time on hover on pointer devices, and Zalo personal
// outgoing messages accepted by the bridge (source id set) get the "sent" tick instead of
// staying on "sending". The bridge does not emit delivered/read today; the mapping below
// only shows those ticks if the backend ever stores such a status.
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import MessageMeta from '../MessageMeta.vue';
import MessageStatus from '../MessageStatus.vue';

const inboxFlags = vi.hoisted(() => ({ zalo: false }));
vi.mock('dashboard/composables/useInbox', () => {
  const no = { value: false };
  return {
    useInbox: () => ({
      isAFacebookInbox: no,
      isALineChannel: no,
      isAPIInbox: no,
      isASmsInbox: no,
      isATelegramChannel: no,
      isATwilioChannel: no,
      isAWebWidgetInbox: no,
      isAWhatsAppChannel: no,
      isAnEmailChannel: no,
      isAnInstagramChannel: no,
      isATiktokChannel: no,
      isAZaloPersonalChannel: { value: inboxFlags.zalo },
    }),
  };
});

const ctx = {
  status: ref('sent'),
  isPrivate: computed(() => false),
  createdAt: ref(Math.floor(new Date('2026-11-17T14:05:00').getTime() / 1000)),
  sourceId: ref('zalo-delivery-1'),
  messageType: ref(1),
  contentAttributes: ref({}),
};
vi.mock('../provider.js', () => ({ useMessageContext: () => ctx }));

const mountMeta = () =>
  mount(MessageMeta, { global: { directives: { tooltip: {} } } });

describe('MessageMeta', () => {
  beforeEach(() => {
    inboxFlags.zalo = false;
    ctx.status.value = 'sent';
    ctx.sourceId.value = 'zalo-delivery-1';
  });

  it('shows the time as HH:mm with the full date as title', () => {
    const time = mountMeta().find('time');
    expect(time.text()).toBe('14:05');
    expect(time.attributes('title')).toBe('17/11/2026 14:05');
  });

  it('hides the time until hover only on pointer devices', () => {
    const classes = mountMeta().find('time').classes();
    expect(classes).toContain('[@media(hover:hover)]:opacity-0');
    expect(classes).toContain('group-hover/msg:opacity-100');
  });

  it.each([
    ['sent', 'sent'],
    ['delivered', 'delivered'],
    ['read', 'read'],
  ])(
    'Zalo personal status %s maps to the %s tick (only "sent" occurs today)',
    (status, expected) => {
      inboxFlags.zalo = true;
      ctx.status.value = status;
      expect(mountMeta().findComponent(MessageStatus).props('status')).toBe(
        expected
      );
    }
  );

  it('a Zalo personal message not yet accepted by the bridge (no source id) shows progress', () => {
    inboxFlags.zalo = true;
    ctx.sourceId.value = '';
    expect(mountMeta().findComponent(MessageStatus).props('status')).toBe(
      'progress'
    );
  });
});
