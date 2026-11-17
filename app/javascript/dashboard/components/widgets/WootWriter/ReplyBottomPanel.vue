<script>
import { ref } from 'vue';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import FileUpload from 'vue-upload-component';
import * as ActiveStorage from 'activestorage';
import inboxMixin from 'shared/mixins/inboxMixin';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { getAllowedFileTypesByChannel } from '@chatwoot/utils';
import VideoCallButton from '../VideoCallButton.vue';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { mapGetters } from 'vuex';
import { vOnClickOutside } from '@vueuse/components';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

export default {
  name: 'ReplyBottomPanel',
  components: { KaloIcon, FileUpload, VideoCallButton },
  directives: { OnClickOutside: vOnClickOutside },
  mixins: [inboxMixin],
  props: {
    isNote: {
      type: Boolean,
      default: false,
    },
    onSend: {
      type: Function,
      default: () => {},
    },
    sendButtonText: {
      type: String,
      default: '',
    },
    // Send shortcut (Enter or Cmd/Ctrl+Enter), shown as the send button tooltip.
    sendButtonHint: {
      type: String,
      default: '',
    },
    recordingAudioDurationText: {
      type: String,
      default: '00:00',
    },
    // inbox prop is used in /mixins/inboxMixin,
    // remove this props when refactoring to composable if not needed
    // eslint-disable-next-line vue/no-unused-properties
    inbox: {
      type: Object,
      default: () => ({}),
    },
    showFileUpload: {
      type: Boolean,
      default: false,
    },
    showAudioRecorder: {
      type: Boolean,
      default: false,
    },
    onFileUpload: {
      type: Function,
      default: () => {},
    },
    toggleEmojiPicker: {
      type: Function,
      default: () => {},
    },
    toggleAudioRecorder: {
      type: Function,
      default: () => {},
    },
    toggleAudioRecorderPlayPause: {
      type: Function,
      default: () => {},
    },
    isRecordingAudio: {
      type: Boolean,
      default: false,
    },
    recordingAudioState: {
      type: String,
      default: '',
    },
    isSendDisabled: {
      type: Boolean,
      default: false,
    },
    isOnPrivateNote: {
      type: Boolean,
      default: false,
    },
    enableMultipleFileUpload: {
      type: Boolean,
      default: true,
    },
    enableWhatsAppTemplates: {
      type: Boolean,
      default: false,
    },
    enableContentTemplates: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: Number,
      required: true,
    },
    // eslint-disable-next-line vue/no-unused-properties
    message: {
      type: String,
      default: '',
    },
    newConversationModalActive: {
      type: Boolean,
      default: false,
    },
    portalSlug: {
      type: String,
      required: true,
    },
    conversationType: {
      type: String,
      default: '',
    },
    showQuotedReplyToggle: {
      type: Boolean,
      default: false,
    },
    quotedReplyEnabled: {
      type: Boolean,
      default: false,
    },
    isEditorDisabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'insertCanned',
    'toggleInsertArticle',
    'selectWhatsappTemplate',
    'selectContentTemplate',
    'toggleQuotedReply',
  ],
  setup(props) {
    const { setSignatureFlagForInbox, fetchSignatureFlagFromUISettings } =
      useUISettings();

    const uploadRef = ref(false);

    const keyboardEvents = {
      '$mod+Alt+KeyA': {
        action: () => {
          // Skip if editor is disabled (e.g., WhatsApp 24-hour window expired)
          if (props.isEditorDisabled) return;

          // TODO: This is really hacky, we need to replace the file picker component with
          // a custom one, where the logic and the component markup is isolated.
          // Once we have the custom component, we can remove the hacky logic below.

          const uploadTriggerButton = document.querySelector(
            '#conversationAttachment'
          );
          if (uploadTriggerButton) uploadTriggerButton.click();
        },
        allowOnFocusedInput: true,
      },
    };

    useKeyboardEvents(keyboardEvents);

    return {
      setSignatureFlagForInbox,
      fetchSignatureFlagFromUISettings,
      uploadRef,
    };
  },
  data() {
    return { showMoreMenu: false };
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
      uiFlags: 'integrations/getUIFlags',
    }),
    wrapClass() {
      return {
        'is-note-mode': this.isNote,
      };
    },
    showAttachButton() {
      if (this.isEditorDisabled) return false;
      return this.showFileUpload || this.isNote;
    },
    showAudioRecorderButton() {
      if (this.isEditorDisabled) return false;
      if (this.isALineChannel || this.isATiktokChannel) {
        return false;
      }
      // Disable audio recorder for safari browser as recording is not supported
      // const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(
      //   navigator.userAgent
      // );

      return (
        this.isFeatureEnabledonAccount(
          this.accountId,
          FEATURE_FLAGS.VOICE_RECORDER
        ) && this.showAudioRecorder
        // !isSafari
      );
    },
    showAudioPlayStopButton() {
      if (this.isEditorDisabled) return false;
      return this.showAudioRecorder && this.isRecordingAudio;
    },
    isInstagramDM() {
      return this.conversationType === 'instagram_direct_message';
    },
    allowedFileTypes() {
      if (this.isOnPrivateNote) {
        return getAllowedFileTypesByChannel();
      }

      let channelType = this.channelType || this.inbox?.channel_type;
      if (this.isAnInstagramChannel || this.isInstagramDM) {
        channelType = INBOX_TYPES.INSTAGRAM;
      }

      return getAllowedFileTypesByChannel({
        channelType,
        medium: this.inbox?.medium,
      });
    },
    enableDragAndDrop() {
      return !this.newConversationModalActive;
    },
    toolClass() {
      return 'inline-flex items-center justify-center gap-1.5 h-8 min-w-8 px-1.5 text-sm font-medium rounded-lg cursor-pointer text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 transition-colors duration-150 motion-reduce:transition-none';
    },
    showCannedButton() {
      // Canned responses ("/") are not available in private notes.
      return !this.isEditorDisabled && !this.isOnPrivateNote;
    },
    // Everything that is not essential lives in the "+" menu.
    moreMenuItems() {
      const items = [];
      if (this.showAudioRecorderButton && !this.isRecordingAudio) {
        items.push({
          key: 'voice',
          icon: 'mic',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.VOICE'),
          action: this.toggleAudioRecorder,
        });
      }
      if (this.showMessageSignatureButton) {
        items.push({
          key: 'signature',
          icon: 'pen',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.SIGNATURE'),
          active: !!this.sendWithSignature,
          action: this.toggleMessageSignature,
        });
      }
      if (this.showQuotedReplyToggle) {
        items.push({
          key: 'quoted-reply',
          icon: 'quote',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.QUOTE'),
          active: this.quotedReplyEnabled,
          action: () => this.$emit('toggleQuotedReply'),
        });
      }
      if (this.enableWhatsAppTemplates) {
        items.push({
          key: 'whatsapp-template',
          icon: 'msg',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.WHATSAPP_TEMPLATE'),
          action: () => this.$emit('selectWhatsappTemplate'),
        });
      }
      if (this.enableContentTemplates) {
        items.push({
          key: 'content-template',
          icon: 'msg',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.CONTENT_TEMPLATE'),
          action: () => this.$emit('selectContentTemplate'),
        });
      }
      if (this.enableInsertArticleInReply) {
        items.push({
          key: 'article',
          icon: 'book',
          label: this.$t('KALO_CHAT_THREAD.COMPOSER.ARTICLE'),
          action: this.toggleInsertArticle,
        });
      }
      return items;
    },
    showVideoCallButton() {
      return (
        (this.isAWebWidgetInbox || this.isAPIInbox) &&
        !this.isOnPrivateNote &&
        !this.isEditorDisabled
      );
    },
    audioRecorderPlayStopIcon() {
      switch (this.recordingAudioState) {
        // playing paused recording stopped inactive destroyed
        case 'playing':
          return 'i-ph-pause';
        case 'paused':
          return 'i-ph-play';
        case 'stopped':
          return 'i-ph-play';
        default:
          return 'i-ph-stop';
      }
    },
    showMessageSignatureButton() {
      if (this.isEditorDisabled) return false;
      return !this.isOnPrivateNote;
    },
    sendWithSignature() {
      // channelType is sourced from inboxMixin
      return this.fetchSignatureFlagFromUISettings(this.channelType);
    },
    enableInsertArticleInReply() {
      return this.portalSlug;
    },
    isFetchingAppIntegrations() {
      return this.uiFlags.isFetching;
    },
  },
  mounted() {
    ActiveStorage.start();
  },
  methods: {
    toggleMoreMenu() {
      this.showMoreMenu = !this.showMoreMenu;
    },
    closeMoreMenu() {
      this.showMoreMenu = false;
    },
    runMoreMenuItem(item) {
      this.closeMoreMenu();
      item.action();
    },
    toggleMessageSignature() {
      this.setSignatureFlagForInbox(this.channelType, !this.sendWithSignature);
    },
    toggleInsertArticle() {
      this.$emit('toggleInsertArticle');
    },
  },
};
</script>

<template>
  <div
    class="flex items-center justify-between gap-2 px-2 pt-1 pb-2"
    :class="wrapClass"
  >
    <div class="flex flex-wrap items-center min-w-0 gap-0.5">
      <button
        v-if="!isEditorDisabled"
        type="button"
        data-test="emoji"
        :title="$t('KALO_CHAT_THREAD.COMPOSER.EMOJI')"
        :aria-label="$t('KALO_CHAT_THREAD.COMPOSER.EMOJI')"
        :class="toolClass"
        @click="toggleEmojiPicker"
      >
        <KaloIcon name="smile" class="size-[18px]" />
      </button>
      <FileUpload
        v-if="showAttachButton"
        ref="uploadRef"
        input-id="conversationAttachment"
        :size="4096 * 4096"
        :accept="allowedFileTypes"
        :multiple="enableMultipleFileUpload"
        :drop="enableDragAndDrop"
        :drop-directory="false"
        :data="{
          direct_upload_url: '/rails/active_storage/direct_uploads',
          direct_upload: true,
        }"
        :title="$t('KALO_CHAT_THREAD.COMPOSER.ATTACH')"
        class="group/attach [&_label]:cursor-pointer"
        @input-file="onFileUpload"
      >
        <span
          data-test="attach"
          :class="toolClass"
          class="group-hover/attach:bg-n-alpha-2 group-hover/attach:text-n-slate-12"
        >
          <KaloIcon name="clip" class="size-[18px]" />
          <span class="sr-only">
            {{ $t('KALO_CHAT_THREAD.COMPOSER.ATTACH') }}
          </span>
        </span>
      </FileUpload>
      <button
        v-if="showCannedButton"
        type="button"
        data-test="canned"
        :title="$t('KALO_CHAT_THREAD.COMPOSER.CANNED_HINT')"
        :aria-label="$t('KALO_CHAT_THREAD.COMPOSER.CANNED')"
        :class="toolClass"
        @click="$emit('insertCanned')"
      >
        <KaloIcon name="tag" class="size-[18px]" />
        <span class="hidden sm:inline">
          {{ $t('KALO_CHAT_THREAD.COMPOSER.CANNED') }}
        </span>
      </button>
      <slot name="actions" />
      <template v-if="showAudioPlayStopButton">
        <button
          type="button"
          data-test="voice-play-pause"
          :class="toolClass"
          @click="toggleAudioRecorderPlayPause"
        >
          <span :class="audioRecorderPlayStopIcon" class="size-4" />
          <span class="tabular-nums">{{ recordingAudioDurationText }}</span>
        </button>
        <button
          type="button"
          data-test="voice-stop"
          :title="$t('KALO_CHAT_THREAD.COMPOSER.VOICE_STOP')"
          :aria-label="$t('KALO_CHAT_THREAD.COMPOSER.VOICE_STOP')"
          :class="toolClass"
          class="!text-n-ruby-11"
          @click="toggleAudioRecorder"
        >
          <KaloIcon name="mic" class="size-[18px]" />
        </button>
      </template>
      <div v-if="moreMenuItems.length" class="relative">
        <button
          type="button"
          data-test="more-menu"
          :title="$t('KALO_CHAT_THREAD.COMPOSER.MORE')"
          :aria-label="$t('KALO_CHAT_THREAD.COMPOSER.MORE')"
          :aria-expanded="showMoreMenu"
          aria-haspopup="menu"
          :class="[
            toolClass,
            { 'bg-n-alpha-2 !text-n-slate-12': showMoreMenu },
          ]"
          @click="toggleMoreMenu"
        >
          <KaloIcon name="plus" class="size-[18px]" />
        </button>
        <Transition
          enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
          enter-from-class="translate-y-1 opacity-0"
          leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
          leave-to-class="translate-y-1 opacity-0"
        >
          <ul
            v-if="showMoreMenu"
            v-on-click-outside="[
              closeMoreMenu,
              { ignore: ['[data-test=more-menu]'] },
            ]"
            role="menu"
            data-test="more-menu-list"
            class="absolute z-30 flex flex-col gap-0.5 p-1 mb-2 list-none border shadow-lg bottom-full ltr:left-0 rtl:right-0 min-w-[13rem] rounded-xl border-n-weak bg-n-solid-1"
            @keydown.esc.stop="closeMoreMenu"
          >
            <li v-for="item in moreMenuItems" :key="item.key">
              <button
                type="button"
                role="menuitem"
                :data-test="`more-${item.key}`"
                class="flex items-center w-full gap-2 px-2.5 py-2 text-sm rounded-lg text-start text-n-slate-12 hover:bg-n-alpha-2"
                @click="runMoreMenuItem(item)"
              >
                <KaloIcon :name="item.icon" class="size-4 text-n-slate-11" />
                <span class="flex-1">{{ item.label }}</span>
                <KaloIcon
                  v-if="item.active"
                  name="check"
                  class="size-4 text-n-brand"
                />
              </button>
            </li>
          </ul>
        </Transition>
      </div>
      <VideoCallButton
        v-if="showVideoCallButton"
        :conversation-id="conversationId"
      />
      <transition name="modal-fade">
        <div
          v-show="uploadRef && uploadRef.dropActive"
          data-test="drop-overlay"
          class="fixed inset-0 z-20 flex flex-col items-center justify-center w-full h-full gap-3 text-n-slate-12 bg-modal-backdrop-light dark:bg-modal-backdrop-dark"
        >
          <span
            class="grid border-2 border-dashed rounded-2xl size-20 place-content-center border-n-brand bg-n-solid-1"
          >
            <KaloIcon name="clip" class="size-9 text-n-brand" />
          </span>
          <h4 class="text-xl font-semibold break-words text-n-slate-12">
            {{ $t('KALO_CHAT_THREAD.COMPOSER.DROP') }}
          </h4>
        </div>
      </transition>
    </div>
    <button
      type="submit"
      data-test="send"
      :title="sendButtonHint"
      :disabled="isSendDisabled"
      class="inline-flex items-center flex-shrink-0 gap-1.5 h-9 px-4 text-sm font-semibold rounded-[10px] transition-colors duration-150 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        isNote
          ? 'bg-n-amber-5 text-n-amber-12 border border-n-amber-7 enabled:hover:bg-n-amber-6'
          : 'bg-n-brand text-white enabled:hover:bg-n-brand/90'
      "
      @click="onSend"
    >
      <KaloIcon :name="isNote ? 'lock' : 'send'" class="size-4" />
      {{ sendButtonText }}
    </button>
  </div>
</template>
