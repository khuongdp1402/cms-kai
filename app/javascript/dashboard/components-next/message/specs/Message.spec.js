// Characterization spec for Message (chat-parity C-43, C-44, C-45, C-47).
// Pins components-next/message/Message.vue:
//  - variant (user/agent/bot/private/email/error/unsupported/activity/template) :164-202
//  - orientation + alignment class                                              :241-263
//  - which bubble renders for each content/attachment type                      :301-369
//  - shouldRenderMessage (empty messages are not rendered)                       :426-444
//  - retry: MessageError emits `retry` through Message                          :609-615
//  - `message<id>` DOM id used by scroll-to-message and `data-message-id`       :556-558
//  - Kalo order card under QR messages                                           :603-607
// Bubbles are auto-stubbed (shallowMount); the provided message context (variant/orientation)
// is read from the component's provides.
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import Message from '../Message.vue';

import TextBubble from '../bubbles/Text/Index.vue';
import ImageBubble from '../bubbles/Image.vue';
import FileBubble from '../bubbles/File.vue';
import AudioBubble from '../bubbles/Audio.vue';
import VideoBubble from '../bubbles/Video.vue';
import FallbackBubble from '../bubbles/Fallback.vue';
import LocationBubble from '../bubbles/Location.vue';
import ContactBubble from '../bubbles/Contact.vue';
import EmbedBubble from '../bubbles/Embed.vue';
import ActivityBubble from '../bubbles/Activity.vue';
import EmailBubble from '../bubbles/Email/Index.vue';
import UnsupportedBubble from '../bubbles/Unsupported.vue';
import CSATBubble from '../bubbles/CSAT.vue';
import FormBubble from '../bubbles/Form.vue';
import StickerBubble from '../bubbles/StickerBubble.vue';
import DyteBubble from '../bubbles/Dyte.vue';
import InstagramStoryBubble from '../bubbles/InstagramStory.vue';
import MessageError from '../MessageError.vue';
import KaloOrderCard from 'dashboard/components/widgets/conversation/KaloOrderCard.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));

const MESSAGE_TYPES = { INCOMING: 0, OUTGOING: 1, ACTIVITY: 2, TEMPLATE: 3 };

const agentSender = { id: 7, type: 'User', name: 'Agent' };

const mountMessage = (props = {}) =>
  shallowMount(Message, {
    props: {
      id: 100,
      messageType: MESSAGE_TYPES.INCOMING,
      status: 'sent',
      content: 'hello',
      conversationId: 1,
      createdAt: 1700000000,
      currentUserId: 7,
      ...props,
    },
    global: {
      plugins: [
        createStore({
          getters: {
            'inboxes/getInbox': () => () => ({}),
            'globalConfig/isOnChatwootCloud': () => false,
            'globalConfig/get': () => ({}),
          },
        }),
      ],
      directives: { tooltip: {} },
    },
  });

// provideMessageContext stores the context under a module-private Symbol; find it by shape.
const ctxOf = wrapper => {
  const { provides } = wrapper.vm.$;
  const key = Object.getOwnPropertySymbols(provides).find(k => provides[k]?.variant);
  return provides[key];
};
const variantOf = wrapper => ctxOf(wrapper).variant.value;
const orientationOf = wrapper => ctxOf(wrapper).orientation.value;
const hasText = wrapper => wrapper.findComponent(TextBubble).exists();

describe('Message variants and orientation (context handed to bubbles)', () => {
  it('incoming message is the `user` variant aligned left', () => {
    const wrapper = mountMessage();
    expect(variantOf(wrapper)).toBe('user');
    expect(orientationOf(wrapper)).toBe('left');
    expect(wrapper.classes()).toContain('justify-start');
  });

  it('outgoing message from an agent is the `agent` variant aligned right', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
    });
    expect(variantOf(wrapper)).toBe('agent');
    expect(orientationOf(wrapper)).toBe('right');
    expect(wrapper.classes()).toContain('justify-end');
  });

  it('private note is the `private` variant, regardless of message type', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
      private: true,
    });
    expect(variantOf(wrapper)).toBe('private');
  });

  it('outgoing message without a sender is the `bot` variant', () => {
    const wrapper = mountMessage({ messageType: MESSAGE_TYPES.OUTGOING });
    expect(variantOf(wrapper)).toBe('bot');
  });

  it('outgoing message from an agent bot is the `bot` variant', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: { id: 3, type: 'agent_bot', name: 'Bot' },
    });
    expect(variantOf(wrapper)).toBe('bot');
  });

  it('failed message is the `error` variant', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
      status: 'failed',
    });
    expect(variantOf(wrapper)).toBe('error');
  });

  it('unsupported message is the `unsupported` variant and renders the unsupported bubble', () => {
    const wrapper = mountMessage({
      contentAttributes: { isUnsupported: true },
    });
    expect(wrapper.findComponent(UnsupportedBubble).exists()).toBe(true);
  });

  it('template message (outbound template) is the `template` variant', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.TEMPLATE,
      sender: agentSender,
      senderId: 7,
    });
    expect(variantOf(wrapper)).toBe('template');
  });

  it('externalEcho (message sent from the native app) is rendered as an agent message', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      contentAttributes: { externalEcho: true },
    });
    expect(variantOf(wrapper)).toBe('agent');
  });

  it('exposes message<ID> DOM id and data-message-id for scroll-to-message', () => {
    const wrapper = mountMessage({ id: 321 });
    expect(wrapper.attributes('id')).toBe('message321');
    expect(wrapper.attributes('data-message-id')).toBe('321');
  });
});

describe('Message bubble selection per channel/content type', () => {
  it('email inbox incoming/outgoing messages use the email bubble (variant email)', () => {
    const wrapper = mountMessage({ isEmailInbox: true });
    expect(wrapper.findComponent(EmailBubble).exists()).toBe(true);
  });

  it('a private note on an email inbox stays a text bubble with the private variant', () => {
    const wrapper = mountMessage({ isEmailInbox: true, private: true });
    expect(variantOf(wrapper)).toBe('private');
    expect(wrapper.findComponent(EmailBubble).exists()).toBe(false);
  });

  it('incoming_email content type uses the email bubble', () => {
    const wrapper = mountMessage({ contentType: 'incoming_email' });
    expect(wrapper.findComponent(EmailBubble).exists()).toBe(true);
  });

  it('web widget text message uses the text bubble', () => {
    const wrapper = mountMessage();
    expect(hasText(wrapper)).toBe(true);
  });

  it('Zalo personal sticker (contentAttributes.sticker) uses the sticker bubble', () => {
    const wrapper = mountMessage({
      content: '[sticker]',
      contentAttributes: { sticker: { id: '123', pack_id: 1 } },
    });
    expect(wrapper.findComponent(StickerBubble).exists()).toBe(true);
  });

  it('sticker content type uses the sticker bubble', () => {
    const wrapper = mountMessage({ content: '[sticker]', contentType: 'sticker' });
    expect(wrapper.findComponent(StickerBubble).exists()).toBe(true);
  });

  it('csat content type uses the CSAT bubble', () => {
    const wrapper = mountMessage({ contentType: 'input_csat' });
    expect(wrapper.findComponent(CSATBubble).exists()).toBe(true);
  });

  it.each(['input_select', 'form'])('%s content type uses the form bubble', type => {
    const wrapper = mountMessage({ contentType: type });
    expect(wrapper.findComponent(FormBubble).exists()).toBe(true);
  });

  it('dyte call messages use the Dyte bubble', () => {
    const wrapper = mountMessage({ contentAttributes: { type: 'dyte' } });
    expect(wrapper.findComponent(DyteBubble).exists()).toBe(true);
  });

  it.each(['story_mention', 'ig_story', 'ig_story_reply', 'ig_post'])(
    'instagram shared type %s uses the instagram story bubble',
    imageType => {
      const wrapper = mountMessage({ contentAttributes: { imageType } });
      expect(wrapper.findComponent(InstagramStoryBubble).exists()).toBe(true);
    }
  );

  describe('single attachment without text', () => {
    const attach = fileType => ({
      content: null,
      attachments: [{ id: 1, fileType, dataUrl: 'u', thumbUrl: 't' }],
    });

    it.each([
      ['image', ImageBubble],
      ['file', FileBubble],
      ['audio', AudioBubble],
      ['video', VideoBubble],
      ['ig_reel', VideoBubble],
      ['embed', EmbedBubble],
      ['location', LocationBubble],
    ])('%s attachment renders its dedicated bubble', (fileType, bubble) => {
      const wrapper = mountMessage(attach(fileType));
      expect(wrapper.findComponent(bubble).exists()).toBe(true);
    });

    it('fallback attachment renders the fallback bubble even with text', () => {
      const wrapper = mountMessage({
        content: 'text',
        attachments: [{ id: 1, fileType: 'fallback' }],
      });
      expect(wrapper.findComponent(FallbackBubble).exists()).toBe(true);
    });

    it('contact attachment renders the contact bubble', () => {
      const wrapper = mountMessage({
        content: 'Name',
        attachments: [{ id: 1, fileType: 'contact' }],
      });
      expect(wrapper.findComponent(ContactBubble).exists()).toBe(true);
    });

    it('image with text falls back to the text bubble (text carries the attachment)', () => {
      const wrapper = mountMessage({
        content: 'caption',
        attachments: [{ id: 1, fileType: 'image' }],
      });
      expect(hasText(wrapper)).toBe(true);
      expect(wrapper.findComponent(ImageBubble).exists()).toBe(false);
    });
  });

  it('multiple attachments render the text bubble', () => {
    const wrapper = mountMessage({
      content: null,
      attachments: [
        { id: 1, fileType: 'image' },
        { id: 2, fileType: 'image' },
      ],
    });
    expect(hasText(wrapper)).toBe(true);
  });
});

describe('Message rendering rules', () => {
  it('activity messages render the activity bubble centered, without avatar', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.ACTIVITY,
      content: 'Agent resolved the conversation',
    });
    expect(wrapper.findComponent(ActivityBubble).exists()).toBe(true);
    expect(wrapper.classes()).toContain('justify-center');
  });

  it('a message with no content, attachments or error renders nothing', () => {
    const wrapper = mountMessage({ content: null });
    expect(wrapper.find('.message-bubble-container').exists()).toBe(false);
  });

  it('a failed message with no content still renders (so retry stays reachable)', () => {
    const wrapper = mountMessage({
      content: null,
      status: 'failed',
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
    });
    expect(wrapper.find('.message-bubble-container').exists()).toBe(true);
  });

  it('groupWithNext adds the group class unless the message failed', () => {
    expect(mountMessage({ groupWithNext: true }).classes()).toContain(
      'group-with-next'
    );
    expect(
      mountMessage({
        groupWithNext: true,
        status: 'failed',
        messageType: MESSAGE_TYPES.OUTGOING,
        sender: agentSender,
        senderId: 7,
      }).classes()
    ).not.toContain('group-with-next');
  });

  it('shows MessageError when contentAttributes.externalError is set and forwards retry', async () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
      status: 'failed',
      contentAttributes: { externalError: 'Network error' },
    });
    const error = wrapper.findComponent(MessageError);
    expect(error.exists()).toBe(true);
    expect(error.props('error')).toBe('Network error');
    await error.vm.$emit('retry');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('renders the Kalo order card under a QR message carrying kchatOrderId', () => {
    const wrapper = mountMessage({
      messageType: MESSAGE_TYPES.OUTGOING,
      sender: agentSender,
      senderId: 7,
      contentAttributes: { kchatOrderId: 42 },
    });
    const card = wrapper.findComponent(KaloOrderCard);
    expect(card.exists()).toBe(true);
    expect(card.props('orderId')).toBe(42);
  });

  it('no order card without kchatOrderId', () => {
    expect(mountMessage().findComponent(KaloOrderCard).exists()).toBe(false);
  });
});
