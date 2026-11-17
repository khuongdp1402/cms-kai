// Characterization spec for MessageStatus + MessageError (chat-parity C-43, C-49).
// Pins components-next/message/MessageStatus.vue:45-93 (icon per status: sent = check,
// delivered/read = check-check, read is blue, progress = rotating clock) and
// components-next/message/MessageError.vue:16-58 (failed label, error text, retry button
// only for failed messages younger than a day that still have content/attachments).
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import MessageStatus from '../MessageStatus.vue';
import MessageError from '../MessageError.vue';
import Icon from 'next/icon/Icon.vue';

const mockContext = {
  orientation: ref('right'),
  status: ref('failed'),
  createdAt: ref(Math.floor(Date.now() / 1000)),
  content: ref('hi'),
  attachments: ref([]),
};
vi.mock('../provider.js', () => ({
  useMessageContext: () => mockContext,
}));

const mountStatus = status =>
  mount(MessageStatus, {
    props: { status },
    global: { directives: { tooltip: {} } },
  });

describe('MessageStatus', () => {
  it.each([
    ['sent', 'i-lucide-check'],
    ['delivered', 'i-lucide-check-check'],
    ['read', 'i-lucide-check-check'],
  ])('%s shows icon %s', (status, icon) => {
    expect(mountStatus(status).findComponent(Icon).props('icon')).toBe(icon);
  });

  it('read is tinted blue, sent/delivered are slate', () => {
    expect(mountStatus('read').classes().join(' ')).toContain('#7EB6FF');
    expect(mountStatus('sent').classes()).toContain('text-n-slate-10');
    expect(mountStatus('delivered').classes()).toContain('text-n-slate-10');
  });

  it('progress shows a clock icon', () => {
    expect(mountStatus('progress').findComponent(Icon).props('icon')).toMatch(
      /^i-lucide-clock-/
    );
  });
});

describe('MessageError', () => {
  const mountError = () => mount(MessageError, { props: { error: 'Boom' } });

  beforeEach(() => {
    mockContext.status.value = 'failed';
    mockContext.createdAt.value = Math.floor(Date.now() / 1000);
    mockContext.content.value = 'hi';
    mockContext.attachments.value = [];
  });

  it('shows the failed label and the error detail', () => {
    const wrapper = mountError();
    expect(wrapper.text()).toContain('Failed to send');
    expect(wrapper.text()).toContain('Boom');
  });

  it('retry button emits retry', async () => {
    const wrapper = mountError();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('retry button is disabled unless the status is failed', () => {
    mockContext.status.value = 'progress';
    expect(mountError().find('button').attributes('disabled')).toBeDefined();
  });

  it('no retry button when the message is older than one day', () => {
    mockContext.createdAt.value = Math.floor(Date.now() / 1000) - 2 * 86400;
    expect(mountError().find('button').exists()).toBe(false);
  });

  it('no retry button when there is neither content nor attachments', () => {
    mockContext.content.value = null;
    expect(mountError().find('button').exists()).toBe(false);
  });

  it('retry is possible for an attachment-only message', () => {
    mockContext.content.value = null;
    mockContext.attachments.value = [{ id: 1 }];
    expect(mountError().find('button').exists()).toBe(true);
  });
});
