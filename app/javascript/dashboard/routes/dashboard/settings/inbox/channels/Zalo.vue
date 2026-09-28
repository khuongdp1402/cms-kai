<script>
import { mapGetters } from 'vuex';
import { useVuelidate } from '@vuelidate/core';
import { useAlert } from 'dashboard/composables';
import { required } from '@vuelidate/validators';
import router from '../../../../index';
import PageHeader from '../../SettingsSubPageHeader.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
  name: 'ZaloChannel',
  components: {
    PageHeader,
    NextButton,
  },
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    return {
      channelName: '',
      zaloOaId: '',
      zaloAppId: '',
      zaloAppSecret: '',
      zaloAccessToken: '',
      zaloRefreshToken: '',
    };
  },
  computed: {
    ...mapGetters({
      uiFlags: 'inboxes/getUIFlags',
    }),
  },
  validations: {
    channelName: { required },
    zaloOaId: { required },
    zaloAppId: { required },
    zaloAppSecret: { required },
    zaloAccessToken: { required },
    zaloRefreshToken: { required },
  },
  methods: {
    async createChannel() {
      this.v$.$touch();
      if (this.v$.$invalid) {
        return;
      }

      try {
        const zaloChannel = await this.$store.dispatch(
          'inboxes/createChannel',
          {
            name: this.channelName?.trim(),
            channel: {
              type: 'api',
              webhook_url: '',
              additional_attributes: {
                channel: 'zalo',
                zalo_oa_id: this.zaloOaId?.trim(),
                zalo_app_id: this.zaloAppId?.trim(),
                zalo_app_secret: this.zaloAppSecret?.trim(),
                zalo_access_token: this.zaloAccessToken?.trim(),
                zalo_refresh_token: this.zaloRefreshToken?.trim(),
              },
            },
          }
        );

        router.replace({
          name: 'settings_inboxes_add_agents',
          params: {
            page: 'new',
            inbox_id: zaloChannel.id,
          },
        });
      } catch (error) {
        useAlert(
          error.message ||
            this.$t('INBOX_MGMT.ADD.ZALO_CHANNEL.API.ERROR_MESSAGE')
        );
      }
    },
  },
};
</script>

<template>
  <div class="h-full w-full p-6 col-span-6">
    <PageHeader
      :header-title="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.TITLE')"
      :header-content="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.DESC')"
    />
    <form
      class="flex flex-wrap flex-col mx-0"
      @submit.prevent="createChannel()"
    >
      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.channelName.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.LABEL') }}
          <input
            v-model="channelName"
            type="text"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.PLACEHOLDER')
            "
            @blur="v$.channelName.$touch"
          />
          <span v-if="v$.channelName.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.ERROR')
          }}</span>
        </label>
      </div>

      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.zaloOaId.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_OA_ID.LABEL') }}
          <input
            v-model="zaloOaId"
            type="text"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_OA_ID.PLACEHOLDER')
            "
            @blur="v$.zaloOaId.$touch"
          />
          <span v-if="v$.zaloOaId.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_OA_ID.ERROR')
          }}</span>
        </label>
      </div>

      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.zaloAppId.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_ID.LABEL') }}
          <input
            v-model="zaloAppId"
            type="text"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.APP_ID')
            "
            @blur="v$.zaloAppId.$touch"
          />
          <span v-if="v$.zaloAppId.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_ID.ERROR')
          }}</span>
        </label>
        <p class="help-text">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_ID.SUBTITLE') }}
        </p>
      </div>

      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.zaloAppSecret.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_SECRET.LABEL') }}
          <input
            v-model="zaloAppSecret"
            type="password"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.APP_SECRET')
            "
            @blur="v$.zaloAppSecret.$touch"
          />
          <span v-if="v$.zaloAppSecret.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_SECRET.ERROR')
          }}</span>
        </label>
        <p class="help-text">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_APP_SECRET.SUBTITLE') }}
        </p>
      </div>

      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.zaloAccessToken.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_ACCESS_TOKEN.LABEL') }}
          <input
            v-model="zaloAccessToken"
            type="text"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_ACCESS_TOKEN.PLACEHOLDER')
            "
            @blur="v$.zaloAccessToken.$touch"
          />
          <span v-if="v$.zaloAccessToken.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_ACCESS_TOKEN.ERROR')
          }}</span>
        </label>
        <p class="help-text">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_ACCESS_TOKEN.SUBTITLE') }}
        </p>
      </div>

      <div class="flex-shrink-0 flex-grow-0">
        <label :class="{ error: v$.zaloRefreshToken.$error }">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_REFRESH_TOKEN.LABEL') }}
          <input
            v-model="zaloRefreshToken"
            type="text"
            :placeholder="
              $t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.REFRESH_TOKEN')
            "
            @blur="v$.zaloRefreshToken.$touch"
          />
          <span v-if="v$.zaloRefreshToken.$error" class="message">{{
            $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_REFRESH_TOKEN.ERROR')
          }}</span>
        </label>
        <p class="help-text">
          {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.ZALO_REFRESH_TOKEN.SUBTITLE') }}
        </p>
      </div>

      <div class="w-full mt-4">
        <NextButton
          :is-loading="uiFlags.isCreating"
          type="submit"
          solid
          blue
          :label="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.SUBMIT_BUTTON')"
        />
      </div>
    </form>
  </div>
</template>
