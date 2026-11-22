<script>
import { useVuelidate } from '@vuelidate/core';
import { required, minLength } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';

import NextButton from 'dashboard/components-next/button/Button.vue';
import Modal from '../../../../components/Modal.vue';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor.vue';

const QUICK_TAGS = [
  'khách sạn',
  'tour',
  'vé máy bay',
  'báo giá',
  'đặt cọc',
  'chăm sóc',
];

const parseTags = raw =>
  String(raw || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

export default {
  name: 'AddCanned',
  components: {
    NextButton,
    Modal,
    WootMessageEditor,
  },
  props: {
    responseContent: {
      type: String,
      default: '',
    },
    onClose: {
      type: Function,
      default: () => {},
    },
  },
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    return {
      shortCode: '',
      content: this.responseContent || '',
      tagsInput: '',
      addCanned: {
        showLoading: false,
        message: '',
      },
      show: true,
    };
  },
  computed: {
    quickTags() {
      return QUICK_TAGS;
    },
    parsedTags() {
      return [...new Set(parseTags(this.tagsInput))];
    },
    normalizedShortCode() {
      return this.shortCode.trim().replace(/^\/+/, '');
    },
  },
  validations: {
    shortCode: {
      required,
      minLength: minLength(2),
    },
    content: {
      required,
    },
  },
  methods: {
    toggleQuickTag(tag) {
      const current = this.parsedTags;
      const next = current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag];
      this.tagsInput = next.join(', ');
    },
    resetForm() {
      this.shortCode = '';
      this.content = '';
      this.tagsInput = '';
      this.v$.shortCode.$reset();
      this.v$.content.$reset();
    },
    addCannedResponse() {
      this.addCanned.showLoading = true;
      this.$store
        .dispatch('createCannedResponse', {
          short_code: this.normalizedShortCode,
          content: this.content,
          tags: this.parsedTags,
        })
        .then(() => {
          this.addCanned.showLoading = false;
          useAlert(this.$t('CANNED_MGMT.ADD.API.SUCCESS_MESSAGE'));
          this.resetForm();
          this.onClose();
        })
        .catch(error => {
          this.addCanned.showLoading = false;
          const errorMessage =
            error?.message || this.$t('CANNED_MGMT.ADD.API.ERROR_MESSAGE');
          useAlert(errorMessage);
        });
    },
  },
};
</script>

<template>
  <Modal v-model:show="show" :on-close="onClose">
    <div class="flex flex-col h-auto overflow-auto">
      <woot-modal-header
        :header-title="$t('CANNED_MGMT.ADD.TITLE')"
        :header-content="$t('CANNED_MGMT.ADD.DESC')"
      />
      <form class="flex flex-col w-full" @submit.prevent="addCannedResponse()">
        <div class="w-full">
          <label :class="{ error: v$.shortCode.$error }">
            {{ $t('CANNED_MGMT.ADD.FORM.SHORT_CODE.LABEL') }}
            <div class="relative flex items-center mt-1">
              <span
                class="absolute left-3 text-sm font-bold pointer-events-none text-n-slate-10"
              >
                {{ '/' }}
              </span>
              <input
                v-model="shortCode"
                type="text"
                class="!pl-6 !mb-0"
                :placeholder="$t('CANNED_MGMT.ADD.FORM.SHORT_CODE.PLACEHOLDER')"
                @blur="v$.shortCode.$touch"
              />
            </div>
          </label>
          <p class="mt-1 mb-2 text-xs text-n-slate-11">
            {{
              $t('KALO_CANNED.KEYWORD_HINT', {
                code: normalizedShortCode || 'keyword',
              })
            }}
          </p>
        </div>

        <div class="w-full mb-3">
          <label>
            {{ $t('KALO_CANNED.TAGS_LABEL') }}
            <input
              v-model="tagsInput"
              type="text"
              data-test="canned-tags-input"
              :placeholder="$t('KALO_CANNED.TAGS_PLACEHOLDER')"
            />
          </label>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">
            <span class="text-xs text-n-slate-11">
              {{ $t('KALO_CANNED.SUGGESTED_TAGS') }}
            </span>
            <button
              v-for="tag in quickTags"
              :key="tag"
              type="button"
              data-test="canned-quick-tag"
              class="px-2 py-0.5 text-xs font-medium border rounded-full transition-colors"
              :class="
                parsedTags.includes(tag)
                  ? 'bg-n-brand text-white border-transparent'
                  : 'bg-n-solid-2 border-n-weak text-n-slate-11 hover:text-n-slate-12'
              "
              @click="toggleQuickTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <div class="w-full">
          <label :class="{ error: v$.content.$error }">
            {{ $t('CANNED_MGMT.ADD.FORM.CONTENT.LABEL') }}
          </label>
          <div class="editor-wrap">
            <WootMessageEditor
              v-model="content"
              class="message-editor [&>div]:px-1"
              :class="{ editor_warning: v$.content.$error }"
              channel-type="Context::Default"
              enable-variables
              :enable-canned-responses="false"
              :placeholder="$t('CANNED_MGMT.ADD.FORM.CONTENT.PLACEHOLDER')"
              @blur="v$.content.$touch"
            />
          </div>
        </div>
        <div class="flex flex-row justify-end w-full gap-2 px-0 py-2">
          <NextButton
            faded
            slate
            type="reset"
            :label="$t('CANNED_MGMT.ADD.CANCEL_BUTTON_TEXT')"
            @click.prevent="onClose"
          />
          <NextButton
            type="submit"
            :label="$t('CANNED_MGMT.ADD.FORM.SUBMIT')"
            :disabled="
              v$.content.$invalid ||
              v$.shortCode.$invalid ||
              addCanned.showLoading
            "
            :is-loading="addCanned.showLoading"
          />
        </div>
      </form>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
:deep(.ProseMirror-menubar) {
  @apply hidden;
}

:deep(.ProseMirror-woot-style) {
  @apply min-h-[12.5rem];
}
</style>
