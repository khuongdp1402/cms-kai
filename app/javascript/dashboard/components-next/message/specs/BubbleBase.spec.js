// Characterization spec for the bubble base (chat-parity C-45, C-47).
// Pins components-next/message/bubbles/Base.vue:41-89,100-185: private notes are amber
// (`bg-n-solid-amber`), agent blue, user slate, error ruby, unsupported dashed;
// the reply-to quote block scrolls to the original message (SCROLL_TO_MESSAGE bus event);
// meta (time/status) is hidden when grouped with the next message.
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Base from '../bubbles/Base.vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';

const ctx = {
  variant: ref('user'),
  orientation: ref('left'),
  inReplyTo: ref(null),
  shouldGroupWithNext: ref(false),
  id: ref(5),
  sender: ref(null),
  senderType: ref(null),
};
vi.mock('../provider.js', () => ({ useMessageContext: () => ctx }));

const mountBase = () =>
  mount(Base, {
    slots: { default: '<span class="body">body</span>' },
    global: {
      stubs: { MessageMeta: { template: '<i class="meta-stub" />' } },
      directives: { 'dompurify-html': (el, { value }) => (el.innerHTML = value) },
    },
  });

describe('bubble Base', () => {
  beforeEach(() => {
    ctx.variant.value = 'user';
    ctx.orientation.value = 'left';
    ctx.inReplyTo.value = null;
    ctx.shouldGroupWithNext.value = false;
  });

  it.each([
    ['private', 'bg-n-solid-amber'],
    ['agent', 'bg-n-solid-blue'],
    ['user', 'bg-n-slate-4'],
    ['bot', 'bg-n-solid-iris'],
    ['error', 'bg-n-ruby-4'],
    ['unsupported', 'border-dashed'],
  ])('%s variant is styled with %s', (variant, cls) => {
    ctx.variant.value = variant;
    expect(mountBase().classes().join(' ')).toContain(cls);
  });

  it('left/right orientation adds the left-bubble / right-bubble hooks', () => {
    expect(mountBase().classes()).toContain('left-bubble');
    ctx.orientation.value = 'right';
    expect(mountBase().classes()).toContain('right-bubble');
  });

  it('renders the slot content and the meta row', () => {
    const wrapper = mountBase();
    expect(wrapper.find('.body').exists()).toBe(true);
    expect(wrapper.find('.meta-stub').exists()).toBe(true);
  });

  it('hides the meta row when grouped with the next message', () => {
    ctx.shouldGroupWithNext.value = true;
    expect(mountBase().find('.meta-stub').exists()).toBe(false);
  });

  it('hides the meta row on activity bubbles', () => {
    ctx.variant.value = 'activity';
    expect(mountBase().find('.meta-stub').exists()).toBe(false);
  });

  it('shows the quoted message and clicking it scrolls to the original', async () => {
    ctx.inReplyTo.value = { id: 77, content: 'quoted text' };
    const handler = vi.fn();
    emitter.on(BUS_EVENTS.SCROLL_TO_MESSAGE, handler);
    const wrapper = mountBase();
    const quote = wrapper.find('.cursor-pointer');
    expect(quote.text()).toContain('quoted text');
    await quote.trigger('click');
    expect(handler).toHaveBeenCalledWith({ messageId: 77 });
    emitter.off(BUS_EVENTS.SCROLL_TO_MESSAGE, handler);
  });
});
