<script setup>
import { computed, ref, watch } from 'vue';
import { getLastMessage } from 'dashboard/helper/conversationHelper';
import Avatar from 'next/avatar/Avatar.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import MessagePreview from './MessagePreview.vue';
import InboxName from '../InboxName.vue';
import TimeAgo from 'dashboard/components/ui/TimeAgo.vue';
import CardLabels from './conversationCardComponents/CardLabels.vue';
import CardPriorityIcon from 'dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon.vue';
import UnreadBadge from 'dashboard/components-next/Conversation/ConversationCard/UnreadBadge.vue';
import SLACardLabel from './components/SLACardLabel.vue';
import VoiceCallStatus from './VoiceCallStatus.vue';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox.vue';
import KaloChannelBadge from 'dashboard/components-next/icon/KaloChannelBadge.vue';

const props = defineProps({
  chat: { type: Object, required: true },
  currentContact: { type: Object, required: true },
  assignee: { type: Object, default: () => ({}) },
  inbox: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false },
  isActiveChat: { type: Boolean, default: false },
  showAssignee: { type: Boolean, default: false },
  showInboxName: { type: Boolean, default: false },
  hideThumbnail: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits([
  'click',
  'contextmenu',
  'selectConversation',
  'deSelectConversation',
]);

const hovered = ref(false);

const unreadCount = computed(() => props.chat.unread_count);
const hasUnread = computed(() => unreadCount.value > 0);
const lastMessageInChat = computed(() => getLastMessage(props.chat));

const voiceCallData = computed(() => {
  const last = lastMessageInChat.value;
  if (last?.content_type !== 'voice_call' || !last.call) {
    return { status: null, direction: null };
  }
  return {
    status: last.call.status,
    direction: last.call.direction === 'outgoing' ? 'outbound' : 'inbound',
  };
});

const isAgentBotAssignee = computed(
  () => props.chat?.meta?.assignee_type === 'AgentBot'
);

const hasSlaPolicyId = computed(
  () => props.chat?.applied_sla?.id && !props.currentContact?.blocked
);

const showLabelsSection = computed(() => {
  return props.chat.labels?.length > 0 || hasSlaPolicyId.value;
});

const messagePreviewClass = computed(() =>
  hasUnread.value ? 'font-medium text-n-slate-12' : 'text-n-slate-11'
);

const onThumbnailHover = () => {
  hovered.value = !props.hideThumbnail;
};

const onThumbnailLeave = () => {
  hovered.value = false;
};

const onSelectConversation = checked => {
  if (checked) {
    emit('selectConversation', props.chat.id, props.inbox.id);
  } else {
    emit('deSelectConversation', props.chat.id, props.inbox.id);
  }
};

const selectedModel = computed({
  get: () => props.selected,
  set: value => onSelectConversation(value),
});

watch(
  () => props.chat.id,
  () => {
    hovered.value = false;
  }
);
</script>

<template>
  <div
    class="relative flex items-start gap-3 py-3 cursor-pointer conversation group border-b border-n-weak transition-colors duration-150 motion-reduce:transition-none hover:bg-n-alpha-1"
    :class="{
      'active bg-n-blue-2 hover:!bg-n-blue-2': isActiveChat,
      'selected bg-n-blue-3': selected,
      'px-0': compact,
      'px-4': !compact,
    }"
    @click="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <span
      v-if="isActiveChat"
      aria-hidden="true"
      class="absolute inset-y-2.5 start-0 w-[3px] rounded-full bg-n-blue-9"
    />
    <div
      class="relative shrink-0"
      @mouseenter="onThumbnailHover"
      @mouseleave="onThumbnailLeave"
    >
      <Avatar
        v-if="!hideThumbnail"
        :name="currentContact.name"
        :src="currentContact.thumbnail"
        :size="40"
        rounded-full
      >
        <template #badge>
          <span
            v-if="currentContact.availability_status === 'online'"
            class="absolute top-0 z-20 rounded-full end-0 size-2.5 bg-n-teal-9 ring-2 ring-n-surface-1"
          />
          <KaloChannelBadge
            :inbox="inbox"
            class="absolute z-20 -bottom-0.5 -end-0.5 ring-2 ring-n-surface-1"
          />
        </template>
        <template #overlay="{ size }">
          <label
            v-if="hovered || selected"
            class="absolute inset-0 z-10 flex items-center justify-center rounded-full cursor-pointer bg-n-alpha-black1 backdrop-blur-[2px]"
            :style="{ width: `${size}px`, height: `${size}px` }"
            @click.stop
          >
            <Checkbox
              v-model="selectedModel"
              :aria-label="
                $t('KALO_POLISH2.A11Y.SELECT_CONVERSATION', {
                  name: currentContact.name,
                })
              "
            />
          </label>
        </template>
      </Avatar>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center min-w-0 gap-1.5">
        <h4
          class="my-0 text-sm capitalize truncate conversation--user text-n-slate-12"
          :class="hasUnread ? 'font-semibold' : 'font-medium'"
        >
          {{ currentContact.name }}
        </h4>
        <InboxName
          v-if="showInboxName"
          :inbox="inbox"
          class="min-w-0 max-w-[45%] shrink [&>:first-child]:hidden"
        />
        <CardPriorityIcon
          :priority="chat.priority"
          class="flex-shrink-0 !size-3.5"
        />
        <span
          class="text-xs font-normal leading-4 shrink-0 ms-auto text-n-slate-10"
        >
          <TimeAgo
            :last-activity-timestamp="chat.timestamp"
            :created-at-timestamp="chat.created_at"
            :conversation-id="chat.id"
          />
        </span>
      </div>
      <div class="flex items-center min-w-0 gap-2 mt-0.5">
        <VoiceCallStatus
          v-if="voiceCallData.status"
          key="voice-status-row"
          :status="voiceCallData.status"
          :direction="voiceCallData.direction"
          :message-preview-class="messagePreviewClass"
          class="flex-1 min-w-0"
        />
        <MessagePreview
          v-else-if="lastMessageInChat"
          key="message-preview"
          :message="lastMessageInChat"
          class="flex-1 min-w-0 my-0 text-sm leading-5 h-5"
          :class="messagePreviewClass"
        />
        <p
          v-else
          key="no-messages"
          class="flex-1 min-w-0 my-0 overflow-hidden text-sm italic leading-5 text-n-slate-10 text-ellipsis whitespace-nowrap"
        >
          {{ $t(`CHAT_LIST.NO_MESSAGES`) }}
        </p>
        <UnreadBadge
          v-if="hasUnread"
          :count="unreadCount"
          class="!bg-n-blue-9 !h-[18px] !min-w-[18px] !max-w-none !text-[11px] font-semibold"
        />
      </div>
      <div
        v-if="(showAssignee && assignee.name) || showLabelsSection"
        class="flex items-center min-w-0 gap-2 mt-1"
      >
        <span
          v-if="showAssignee && assignee.name"
          class="inline-flex items-center gap-1 text-xs font-medium truncate shrink-0 max-w-[50%] text-n-slate-11"
        >
          <Icon
            :icon="isAgentBotAssignee ? 'i-lucide-bot' : 'i-lucide-user-round'"
            class="flex-shrink-0 size-3 text-n-slate-10"
          />
          <span class="truncate">{{ assignee.name }}</span>
        </span>
        <CardLabels
          v-if="showLabelsSection"
          :conversation-labels="chat.labels"
          class="flex-1 min-w-0 m-0"
        >
          <template v-if="hasSlaPolicyId" #before>
            <SLACardLabel :chat="chat" class="ltr:mr-1 rtl:ml-1" />
          </template>
        </CardLabels>
      </div>
    </div>
  </div>
</template>
