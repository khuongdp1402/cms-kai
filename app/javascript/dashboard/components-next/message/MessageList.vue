<script setup>
import { computed, reactive } from 'vue';
import Message from './Message.vue';
import KaloActivityGroup from './KaloActivityGroup.vue';
import { isRenderableMessage } from './messageVisibility.js';
import { MESSAGE_TYPES } from './constants.js';
import { useCamelCase } from 'dashboard/composables/useTransformKeys';
import { useMapGetter } from 'dashboard/composables/store.js';
import MessageApi from 'dashboard/api/inbox/message.js';
import { useI18n } from 'vue-i18n';
import {
  format,
  fromUnixTime,
  isSameDay,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns';

/**
 * Props definition for the component
 * @typedef {Object} Props
 * @property {Array} readMessages - Array of read messages
 * @property {Array} unReadMessages - Array of unread messages
 * @property {Number} currentUserId - ID of the current user
 * @property {Boolean} isAnEmailChannel - Whether this is an email channel
 * @property {Object} inboxSupportsReplyTo - Inbox reply support configuration
 * @property {Array} messages - Array of all messages [These are not in camelcase]
 */
const props = defineProps({
  currentUserId: {
    type: Number,
    required: true,
  },
  firstUnreadId: {
    type: Number,
    default: null,
  },
  isAnEmailChannel: {
    type: Boolean,
    default: false,
  },
  inboxSupportsReplyTo: {
    type: Object,
    default: () => ({ incoming: false, outgoing: false }),
  },
  messages: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['retry']);

const allMessages = computed(() => {
  return useCamelCase(props.messages, {
    deep: true,
    stopPaths: ['content_attributes.translations'],
  });
});

const currentChat = useMapGetter('getSelectedChat');
const { t } = useI18n();

const dayLabel = createdAt => {
  const date = fromUnixTime(createdAt);
  if (isToday(date)) return t('KALO_CHAT_THREAD.TODAY');
  if (isYesterday(date)) return t('KALO_CHAT_THREAD.YESTERDAY');
  return format(date, isThisYear(date) ? 'dd/MM' : 'dd/MM/yyyy');
};

// A subtle day separator before the first visible message of each day (the list is not
// virtualised). Messages that render no bubble are skipped so no day shows an empty
// separator. Grouped bubbles never straddle midnight: grouping needs the same minute.
const daySeparators = computed(() => {
  const labels = {};
  let previousDate = null;
  allMessages.value.forEach((message, index) => {
    if (!message.createdAt || !isRenderableMessage(message)) return;
    const date = fromUnixTime(message.createdAt);
    if (!previousDate || !isSameDay(previousDate, date)) {
      labels[index] = dayLabel(message.createdAt);
    }
    previousDate = date;
  });
  return labels;
});

// Cache for fetched reply messages to avoid duplicate API calls
const fetchedReplyMessages = reactive(new Map());

/**
 * Fetches a specific message from the API by trying to get messages around it
 * @param {number} messageId - The ID of the message to fetch
 * @param {number} conversationId - The ID of the conversation
 * @returns {Promise<Object|null>} - The fetched message or null if not found/error
 */
const fetchReplyMessage = async (messageId, conversationId) => {
  // Return cached result if already fetched
  if (fetchedReplyMessages.has(messageId)) {
    return fetchedReplyMessages.get(messageId);
  }

  try {
    const response = await MessageApi.getPreviousMessages({
      conversationId,
      before: messageId + 100,
      after: messageId - 100,
    });

    const messages = response.data?.payload || [];
    const targetMessage = messages.find(msg => msg.id === messageId);

    if (targetMessage) {
      const camelCaseMessage = useCamelCase(targetMessage);
      fetchedReplyMessages.set(messageId, camelCaseMessage);
      return camelCaseMessage;
    }

    // Cache null result to avoid repeated API calls
    fetchedReplyMessages.set(messageId, null);
    return null;
  } catch (error) {
    fetchedReplyMessages.set(messageId, null);
    return null;
  }
};

/**
 * Determines if a message should be grouped with the next message
 * @param {Number} index - Index of the current message
 * @param {Array} searchList - Array of messages to check
 * @returns {Boolean} - Whether the message should be grouped with next
 */
const shouldGroupWithNext = (index, searchList) => {
  if (index === searchList.length - 1) return false;

  const current = searchList[index];
  const next = searchList[index + 1];

  if (next.status === 'failed') return false;

  const nextSenderId = next.senderId ?? next.sender?.id;
  const currentSenderId = current.senderId ?? current.sender?.id;
  const hasSameSender = nextSenderId === currentSenderId;

  const nextMessageType = next.messageType;
  const currentMessageType = current.messageType;

  const areBothTemplates =
    nextMessageType === MESSAGE_TYPES.TEMPLATE &&
    currentMessageType === MESSAGE_TYPES.TEMPLATE;

  if (!hasSameSender || areBothTemplates) return false;

  if (currentMessageType !== nextMessageType) return false;

  // Check if messages are in the same minute by rounding down to nearest minute
  return Math.floor(next.createdAt / 60) === Math.floor(current.createdAt / 60);
};

/**
 * Gets the message that was replied to
 * @param {Object} parentMessage - The message containing the reply reference
 * @returns {Object|null} - The message being replied to, or null if not found
 */
const getInReplyToMessage = parentMessage => {
  if (!parentMessage) return null;

  const inReplyToMessageId =
    parentMessage.contentAttributes?.inReplyTo ??
    parentMessage.content_attributes?.in_reply_to;

  if (!inReplyToMessageId) return null;

  // Try to find in current messages first
  let replyMessage = props.messages?.find(msg => msg.id === inReplyToMessageId);

  // Then try store messages
  if (!replyMessage && currentChat.value?.messages) {
    replyMessage = currentChat.value.messages.find(
      msg => msg.id === inReplyToMessageId
    );
  }

  // Then check fetch cache
  if (!replyMessage && fetchedReplyMessages.has(inReplyToMessageId)) {
    replyMessage = fetchedReplyMessages.get(inReplyToMessageId);
  }

  // If still not found and we have conversation context, fetch it
  if (!replyMessage && currentChat.value?.id) {
    fetchReplyMessage(inReplyToMessageId, currentChat.value.id);
    return null; // Let UI handle loading state
  }

  return replyMessage ? useCamelCase(replyMessage) : null;
};

const isCollapsibleActivity = message =>
  message?.messageType === MESSAGE_TYPES.ACTIVITY &&
  isRenderableMessage(message);

// Group 2+ consecutive system activity messages into a compact expandable pill,
// stopping before any day boundary or the first unread marker.
const renderEntries = computed(() => {
  const list = allMessages.value;
  const seps = daySeparators.value;
  const entries = [];
  let i = 0;

  while (i < list.length) {
    const current = list[i];
    if (
      isCollapsibleActivity(current) &&
      !(props.firstUnreadId && current.id === props.firstUnreadId)
    ) {
      const group = [current];
      let j = i + 1;
      while (j < list.length) {
        const next = list[j];
        if (
          seps[j] ||
          (props.firstUnreadId && next.id === props.firstUnreadId) ||
          !isCollapsibleActivity(next)
        ) {
          break;
        }
        group.push(next);
        j += 1;
      }

      if (group.length >= 2) {
        entries.push({
          type: 'activity-group',
          key: `act-group-${current.id}`,
          firstIndex: i,
          firstId: current.id,
          messages: group,
        });
        i = j;
      } else {
        entries.push({
          type: 'message',
          key: current.id,
          index: i,
          message: current,
        });
        i += 1;
      }
    } else {
      entries.push({
        type: 'message',
        key: current.id,
        index: i,
        message: current,
      });
      i += 1;
    }
  }

  return entries;
});
</script>

<template>
  <ul class="px-3 sm:px-6 bg-n-background">
    <slot name="beforeAll" />
    <template v-for="entry in renderEntries" :key="entry.key">
      <li
        v-if="
          daySeparators[entry.type === 'message' ? entry.index : entry.firstIndex]
        "
        data-test="day-separator"
        class="flex justify-center my-3 list-none"
      >
        <span
          class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-n-surface-1 border border-n-weak text-n-slate-11"
        >
          {{
            daySeparators[
              entry.type === 'message' ? entry.index : entry.firstIndex
            ]
          }}
        </span>
      </li>
      <slot
        v-if="
          entry.type === 'message' &&
          firstUnreadId &&
          entry.message.id === firstUnreadId
        "
        name="unreadBadge"
      />
      <KaloActivityGroup
        v-if="entry.type === 'activity-group'"
        :messages="entry.messages"
      />
      <Message
        v-else
        v-bind="entry.message"
        :is-email-inbox="isAnEmailChannel"
        :in-reply-to="getInReplyToMessage(entry.message)"
        :group-with-next="shouldGroupWithNext(entry.index, allMessages)"
        :inbox-supports-reply-to="inboxSupportsReplyTo"
        :current-user-id="currentUserId"
        data-clarity-mask="True"
        @retry="emit('retry', entry.message)"
      />
    </template>
    <slot name="after" />
  </ul>
</template>
