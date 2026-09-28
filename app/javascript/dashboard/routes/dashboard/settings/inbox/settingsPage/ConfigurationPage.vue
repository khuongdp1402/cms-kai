<script>
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useWhatsappEmbeddedSignup } from 'dashboard/composables/useWhatsappEmbeddedSignup';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import whatsappChannel from 'dashboard/api/channel/whatsappChannel';
import inboxMixin from 'shared/mixins/inboxMixin';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection.vue';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection.vue';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion.vue';
import ImapSettings from '../ImapSettings.vue';
import SmtpSettings from '../SmtpSettings.vue';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import NextButton from 'dashboard/components-next/button/Button.vue';
import TextArea from 'next/textarea/TextArea.vue';
import { sanitizeAllowedDomains } from 'dashboard/helper/URLHelper';

export default {
  components: {
    SettingsFieldSection,
    SettingsToggleSection,
    SettingsAccordion,
    ImapSettings,
    SmtpSettings,
    NextButton,
    TextArea,
  },
  mixins: [inboxMixin],
  props: {
    inbox: {
      type: Object,
      default: () => ({}),
    },
  },
  setup() {
    const { runEmbeddedSignup } = useWhatsappEmbeddedSignup();
    return { v$: useVuelidate(), runEmbeddedSignup };
  },
  data() {
    return {
      hmacMandatory: false,
      allowMobileWebview: false,
      whatsAppInboxAPIKey: '',
      isSyncingTemplates: false,
      allowedDomains: '',
      isUpdatingAllowedDomains: false,
      isSettingDefaults: false,
      isReconfiguring: false,
      zaloAccessToken: '',
      zaloOaId: '',
      zaloAppId: '',
      zaloAppSecret: '',
      zaloRefreshToken: '',
      zaloOaCookie: '',
      zaloOaImei: '',
      selectedJ2TeamFileName: '',
      zaloQrImage: null,
      zaloQrStatus: '⏳ Đang nạp mã QR Code từ Zalo...',
      isZaloQrConnected: false,
      qrInterval: null,
      isUpdatingZalo: false,
      activeZaloTab: 'hybrid',
      zaloPersonalBridgeUrl: 'http://localhost:5001',
    };
  },
  validations: {
    whatsAppInboxAPIKey: { required },
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
      isOnChatwootCloud: 'globalConfig/isOnChatwootCloud',
    }),
    isEmbeddedSignupWhatsApp() {
      return this.inbox.provider_config?.source === 'embedded_signup';
    },
    showWhatsAppReconfigure() {
      return (
        this.isEmbeddedSignupWhatsApp &&
        this.isFeatureEnabledonAccount(
          this.accountId,
          this.isOnChatwootCloud
            ? FEATURE_FLAGS.WHATSAPP_EMBEDDED_SIGNUP_FLOW
            : FEATURE_FLAGS.WHATSAPP_RECONFIGURE
        )
      );
    },
    isForwardingEnabled() {
      return !!this.inbox.forwarding_enabled;
    },
    isZaloChannel() {
      const attrs = this.inbox.additional_attributes || {};
      const webhookUrl = this.inbox.webhook_url || '';
      return (
        this.isAPIInbox ||
        attrs.channel === 'zalo' ||
        attrs.zalo_type === 'personal' ||
        webhookUrl.includes('zalo') ||
        this.inbox.name?.toLowerCase().includes('zalo')
      );
    },
  },
  watch: {
    inbox() {
      this.setDefaults();
    },
    allowMobileWebview() {
      if (!this.isSettingDefaults) this.handleMobileWebviewFlag();
    },
    hmacMandatory() {
      if (!this.isSettingDefaults && this.isAWebWidgetInbox)
        this.handleHmacFlag();
    },
  },
  mounted() {
    this.setDefaults();
    this.startQrPolling();
  },
  beforeUnmount() {
    if (this.qrInterval) clearInterval(this.qrInterval);
  },
  methods: {
    parseCookieInput(input) {
      if (!input) return '';
      const trimmed = input.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed);
        } catch (e) {
          // not valid JSON, return raw string
        }
      }
      return trimmed;
    },
    handleJ2TeamFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.selectedJ2TeamFileName = file.name;
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target.result;
        const formattedCookie = this.parseCookieInput(content);
        if (formattedCookie) {
          this.zaloOaCookie = formattedCookie;
          if (!this.zaloOaImei) {
            this.zaloOaImei =
              'zalo_oa_imei_' + Math.random().toString(36).substring(2, 10);
          }
          alert('🎉 Đã trích xuất Cookie từ file JSON J2TEAM thành công! Bấm "Lưu Cấu Hình" hoặc "Kết Nối Cookie" để kích hoạt.');
        } else {
          alert('❌ File JSON không chứa dữ liệu Cookie J2TEAM hợp lệ.');
        }
      };
      reader.readAsText(file);
    },
    async disconnectZaloOa() {
      if (
        !confirm(
          'Bạn có chắc chắn muốn đăng xuất tài khoản Zalo OA hiện tại để quét mã QR mới?'
        )
      )
        return;
      try {
        const res = await fetch('/zalo-oa-logout', { method: 'POST' });
        if (!res.ok) {
          throw new Error('Cầu nối phản hồi lỗi HTTP ' + res.status);
        }
        this.isZaloQrConnected = false;
        this.zaloQrStatus = '⏳ Đã đăng xuất. Vui lòng nạp Cookie hoặc quét mã QR mới...';
        this.zaloQrImage = null;
        alert('🎉 Đã đăng xuất Cầu nối Zalo OA! Đang chuẩn bị trạng thái mới.');
        this.checkZaloQrCode();
      } catch (e) {
        alert('❌ Lỗi đăng xuất Cầu nối Zalo OA: ' + e.message);
      }
    },
    async connectZaloOaCookie() {
      if (!this.zaloOaCookie) {
        alert(
          '⚠️ Vui lòng dán Cookie hoặc tải file JSON từ tiện ích J2TEAM vào đây!'
        );
        return;
      }
      const cookieStr = this.parseCookieInput(this.zaloOaCookie);
      this.zaloOaCookie = cookieStr;
      try {
        const imei =
          this.zaloOaImei ||
          'zalo_oa_imei_' + Math.random().toString(36).substring(2, 10);
        const res = await fetch('/zalo-oa/login-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cookies: cookieStr,
            imei: imei,
            userAgent: navigator.userAgent,
          }),
        });
        const data = await res.json();
        if (data.status === 'success' || data.connected) {
          alert('🎉 Đã kết nối Cầu nối Zalo OA thành công!');
          this.checkZaloQrCode();
        } else {
          alert('❌ Lỗi kết nối: ' + (data.message || data.error || data.status || 'Không thể kết nối Zalo OA'));
        }
      } catch (e) {
        alert('❌ Lỗi kết nối Cầu nối Zalo OA: ' + e.message);
      }
    },
    async checkZaloQrCode() {
      try {
        const res = await fetch('/zalo-oa/api/qr');
        const data = await res.json();
        this.isZaloQrConnected = data.connected || false;
        this.zaloQrStatus = data.status || '⏳ Đang chờ quét mã QR...';
        if (data.qr) {
          this.zaloQrImage = data.qr;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('QR check error:', e.message);
      }
    },
    startQrPolling() {
      if (this.qrInterval) clearInterval(this.qrInterval);
      if (this.activeZaloTab !== 'hybrid' || this.isZaloQrConnected) return;
      this.checkZaloQrCode();
      this.qrInterval = setInterval(() => {
        if (this.activeZaloTab === 'hybrid' && !this.isZaloQrConnected) {
          this.checkZaloQrCode();
        }
      }, 5000);
    },
    setDefaults() {
      this.isSettingDefaults = true;
      this.hmacMandatory = this.inbox.hmac_mandatory || false;
      this.allowMobileWebview = (
        this.inbox.selected_feature_flags || []
      ).includes('allow_mobile_webview');
      this.allowedDomains = this.inbox.allowed_domains || '';
      const channelAttrs = this.inbox.additional_attributes || {};
      this.zaloAccessToken = channelAttrs.zalo_access_token || '';
      this.zaloOaId = channelAttrs.zalo_oa_id || '';
      this.zaloAppId = channelAttrs.zalo_app_id || '';
      this.zaloAppSecret = channelAttrs.zalo_app_secret || '';
      this.zaloRefreshToken = channelAttrs.zalo_refresh_token || '';
      this.zaloOaCookie = channelAttrs.zalo_oa_cookie || '';
      this.zaloOaImei = channelAttrs.zalo_oa_imei || '';
      this.zaloPersonalBridgeUrl =
        channelAttrs.zalo_personal_bridge_url || 'http://localhost:5001';
      this.activeZaloTab =
        channelAttrs.zalo_type ||
        (this.inbox.name?.toLowerCase().includes('cá nhân') ||
        channelAttrs.zalo_type === 'personal'
          ? 'personal'
          : 'hybrid');

      this.$nextTick(() => {
        this.isSettingDefaults = false;
      });
    },
    handleHmacFlag() {
      this.updateInbox();
    },
    async updateInbox() {
      try {
        const payload = {
          id: this.inbox.id,
          formData: false,
          channel: {
            hmac_mandatory: this.hmacMandatory,
          },
        };
        await this.$store.dispatch('inboxes/updateInbox', payload);
        useAlert(this.$t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
      } catch (error) {
        useAlert(this.$t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
      }
    },
    async handleMobileWebviewFlag() {
      try {
        const currentFlags = this.inbox.selected_feature_flags || [];
        const selectedFlags = this.allowMobileWebview
          ? [...currentFlags, 'allow_mobile_webview']
          : currentFlags.filter(f => f !== 'allow_mobile_webview');

        const payload = {
          id: this.inbox.id,
          formData: false,
          channel: {
            selected_feature_flags: selectedFlags,
          },
        };
        await this.$store.dispatch('inboxes/updateInbox', payload);
        useAlert(this.$t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
      } catch (error) {
        useAlert(this.$t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
      }
    },
    async updateAllowedDomains() {
      this.isUpdatingAllowedDomains = true;
      const sanitizedAllowedDomains = sanitizeAllowedDomains(
        this.allowedDomains
      );
      try {
        const payload = {
          id: this.inbox.id,
          formData: false,
          channel: {
            allowed_domains: sanitizedAllowedDomains,
          },
        };
        await this.$store.dispatch('inboxes/updateInbox', payload);
        this.allowedDomains = sanitizedAllowedDomains;
        useAlert(this.$t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
      } catch (error) {
        useAlert(this.$t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
      } finally {
        this.isUpdatingAllowedDomains = false;
      }
    },
    async updateZaloCredentials(tabType) {
      this.isUpdatingZalo = true;
      try {
        const selectedType = tabType || this.activeZaloTab;
        const currentAttrs = this.inbox.additional_attributes || {};
        const payload = {
          id: this.inbox.id,
          formData: false,
          channel: {
            additional_attributes: {
              ...currentAttrs,
              channel: 'zalo',
              zalo_type: selectedType,
              zalo_connection_mode:
                selectedType === 'hybrid' ? 'cookie' : 'official',
              zalo_access_token: this.zaloAccessToken,
              zalo_oa_id: this.zaloOaId,
              zalo_app_id: this.zaloAppId,
              zalo_app_secret: this.zaloAppSecret,
              zalo_refresh_token: this.zaloRefreshToken,
              zalo_oa_cookie: this.zaloOaCookie,
              zalo_oa_imei: this.zaloOaImei,
              zalo_personal_bridge_url: this.zaloPersonalBridgeUrl,
            },
          },
        };
        await this.$store.dispatch('inboxes/updateInbox', payload);

        if (selectedType === 'hybrid' && this.zaloOaCookie && this.zaloOaImei) {
          try {
            await fetch('/zalo-oa/login-cookie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cookies: this.zaloOaCookie,
                imei: this.zaloOaImei,
              }),
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log('Bridge auto login notice:', e.message);
          }
        }

        useAlert('Cập nhật Cấu hình Zalo thành công!');
      } catch (error) {
        useAlert('Lỗi cập nhật Cấu hình Zalo');
      } finally {
        this.isUpdatingZalo = false;
      }
    },
    async updateWhatsAppInboxAPIKey() {
      try {
        const payload = {
          id: this.inbox.id,
          formData: false,
          channel: {},
        };

        payload.channel.provider_config = {
          ...this.inbox.provider_config,
          api_key: this.whatsAppInboxAPIKey,
        };

        await this.$store.dispatch('inboxes/updateInbox', payload);
        useAlert(this.$t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
      } catch (error) {
        useAlert(this.$t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
      }
    },
    async reconfigureWhatsApp() {
      this.isReconfiguring = true;
      try {
        const credentials = await this.runEmbeddedSignup();
        // User dismissed the Meta popup without completing signup.
        if (!credentials) return;

        await whatsappChannel.reauthorizeWhatsApp({
          inboxId: this.inbox.id,
          ...credentials,
        });
        useAlert(
          this.$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_RECONFIGURE_SUCCESS')
        );
      } catch (error) {
        useAlert(
          this.$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_RECONFIGURE_ERROR')
        );
      } finally {
        this.isReconfiguring = false;
      }
    },
    async syncTemplates() {
      this.isSyncingTemplates = true;
      try {
        await this.$store.dispatch('inboxes/syncTemplates', this.inbox.id);
        useAlert(
          this.$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_SUCCESS')
        );
      } catch (error) {
        useAlert(this.$t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
      } finally {
        this.isSyncingTemplates = false;
      }
    },
  },
};
</script>

<template>
  <div v-if="isATwilioChannel">
    <SettingsFieldSection
      :label="$t('INBOX_MGMT.ADD.TWILIO.API_CALLBACK.TITLE')"
      :help-text="$t('INBOX_MGMT.ADD.TWILIO.API_CALLBACK.SUBTITLE')"
    >
      <woot-code :script="inbox.callback_webhook_url" lang="html" />
    </SettingsFieldSection>
    <SettingsFieldSection
      v-if="isATwilioWhatsAppChannel"
      :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_TITLE')"
      :help-text="
        $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_SUBHEADER')
      "
    >
      <NextButton :disabled="isSyncingTemplates" @click="syncTemplates">
        {{ $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_BUTTON') }}
      </NextButton>
    </SettingsFieldSection>
  </div>

  <div v-else-if="isALineChannel">
    <SettingsFieldSection
      :label="$t('INBOX_MGMT.ADD.LINE_CHANNEL.API_CALLBACK.TITLE')"
      :help-text="$t('INBOX_MGMT.ADD.LINE_CHANNEL.API_CALLBACK.SUBTITLE')"
    >
      <woot-code :script="inbox.callback_webhook_url" lang="html" />
    </SettingsFieldSection>
  </div>
  <div v-else-if="isAWebWidgetInbox">
    <div class="space-y-4">
      <SettingsToggleSection
        :header="$t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.TITLE')"
        :description="
          $t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.DESCRIPTION')
        "
        hide-toggle
      >
        <template #editor>
          <TextArea
            v-model="allowedDomains"
            :placeholder="
              $t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.PLACEHOLDER')
            "
            auto-height
            resize
            class="w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!border-0 [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-0"
          />
          <div class="mt-3 flex justify-end">
            <NextButton
              :label="$t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')"
              :is-loading="isUpdatingAllowedDomains"
              @click="updateAllowedDomains"
            />
          </div>
        </template>
      </SettingsToggleSection>
      <SettingsToggleSection
        v-model="allowMobileWebview"
        :header="$t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MOBILE_WEBVIEW.LABEL')"
        :description="
          $t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MOBILE_WEBVIEW.SUBTITLE')
        "
      />
    </div>

    <SettingsAccordion
      :title="$t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.TITLE')"
      class="mt-6"
    >
      <SettingsToggleSection
        :header="$t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.TITLE')"
        :description="
          $t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.DESCRIPTION')
        "
        hide-toggle
      >
        <template #editor>
          <p class="mb-1 text-sm font-medium text-n-slate-12">
            {{ $t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.SECRET_KEY') }}
          </p>
          <woot-code :script="inbox.hmac_token" />
          <p class="mt-1.5 text-label-small text-n-slate-11">
            {{ $t('INBOX_MGMT.SETTINGS_POPUP.HMAC_DESCRIPTION') }}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.chatwoot.com/docs/product/channels/live-chat/sdk/identity-validation/"
              class="text-n-blue-11 hover:underline text-label-small"
            >
              {{
                $t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.VIEW_DOCS')
              }}
            </a>
          </p>
        </template>
      </SettingsToggleSection>

      <SettingsToggleSection
        v-model="hmacMandatory"
        :header="
          $t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.REQUIRE_LABEL')
        "
        :description="
          $t(
            'INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.REQUIRE_DESCRIPTION'
          )
        "
      />
    </SettingsAccordion>
  </div>
  <div v-else-if="isAPIInbox">
    <!-- ZALO 3-LUỒNG CONFIGURATION -->
    <div v-if="isZaloChannel" class="mb-6 space-y-4">
      <div class="p-4 rounded-xl bg-n-solid-2 border border-n-weak">
        <h3 class="text-base font-bold text-n-slate-12 mb-1">
          Cấu Hình Kênh Zalo (3 Phương Thức Tích Hợp)
        </h3>
        <p class="text-xs text-n-slate-11 leading-relaxed">
          Hệ thống hỗ trợ 3 phương thức cài đặt Zalo độc lập. Vui lòng chọn tab tương ứng với phương thức bạn muốn cấu hình.
        </p>
      </div>

      <!-- TAB SELECTION BUTTONS -->
      <div class="flex border-b border-n-weak space-x-6 pt-2">
        <button
          type="button"
          class="pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          :class="activeZaloTab === 'hybrid' ? 'border-n-blue-9 text-n-blue-11' : 'border-transparent text-n-slate-11 hover:text-n-slate-12'"
          @click="activeZaloTab = 'hybrid'"
        >
          <span>🟢 1. Zalo OA Hybrid (QR / Cookie 0đ)</span>
        </button>
        <button
          type="button"
          class="pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          :class="activeZaloTab === 'personal' ? 'border-n-blue-9 text-n-blue-11' : 'border-transparent text-n-slate-11 hover:text-n-slate-12'"
          @click="activeZaloTab = 'personal'"
        >
          <span>🔵 2. Zalo Cá Nhân (ZCA Bridge)</span>
        </button>
        <button
          type="button"
          class="pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          :class="activeZaloTab === 'official' ? 'border-n-blue-9 text-n-blue-11' : 'border-transparent text-n-slate-11 hover:text-n-slate-12'"
          @click="activeZaloTab = 'official'"
        >
          <span>🟣 3. Zalo OA Official OpenAPI</span>
        </button>
      </div>

      <!-- TAB 1: ZALO OA HYBRID (QR / COOKIE 0đ) -->
      <div v-if="activeZaloTab === 'hybrid'" class="space-y-6 pt-2">
        <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
          <b>💡 Phương thức 1: Zalo OA Hybrid Web Bridge (0 VNĐ)</b><br />
          Gửi và nhận tin nhắn Zalo OA 2 chiều tự động 0 VNĐ không tốn phí API Zalo Developers. Quét mã QR bên dưới hoặc dán Cookie thu được từ <code>oa.zalo.me</code>.
        </div>

        <div class="p-6 border border-n-weak rounded-2xl bg-n-solid-2 text-center max-w-lg mx-auto shadow-sm">
          <div v-if="isZaloQrConnected" class="py-4 space-y-3">
            <div class="w-14 h-14 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h3 class="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.CONNECTED') }}
            </h3>
            <p class="text-xs text-n-slate-11">
              {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.CONNECTED_DESC') }}
            </p>
            <div class="pt-2">
              <NextButton
                label="🔄 Đăng xuất & Quét mã QR mới"
                type="button"
                @click="disconnectZaloOa"
              />
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="inline-block p-3 bg-white rounded-xl shadow-md my-2">
              <img
                v-if="zaloQrImage"
                :src="zaloQrImage"
                alt="Mã QR Zalo"
                class="w-64 h-64 mx-auto rounded-lg"
              />
              <div
                v-else
                class="w-64 h-64 flex items-center justify-center text-xs text-slate-500 font-mono"
              >
                {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.LOADING_QR') }}
              </div>
            </div>

            <div class="text-xs font-semibold text-n-slate-12 bg-n-solid-1 py-2 px-4 rounded-xl border border-n-weak inline-block">
              {{ zaloQrStatus }}
            </div>

            <div class="text-xs text-n-slate-11 text-left bg-n-solid-1 p-4 rounded-xl border border-n-weak space-y-1.5 leading-relaxed">
              <div class="font-semibold text-n-slate-12 text-sm">
                {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.GUIDE_TITLE') }}
              </div>
              <div>{{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_1') }}</div>
              <div>
                {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_2_PRE') }}<b>{{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_2_BOLD') }}</b>{{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_2_POST') }}
              </div>
              <div>
                {{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_3_PRE') }}<b>{{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_3_BOLD') }}</b>{{ $t('INBOX_MGMT.ADD.ZALO_CHANNEL.BRIDGE.STEP_3_POST') }}
              </div>
            </div>
          </div>
        </div>

        <!-- CARD IMPORT FILE J2TEAM JSON (GIỐNG ZALO OA WEB BRIDGE DASHBOARD) -->
        <div class="p-6 border border-n-weak rounded-2xl bg-n-solid-2 space-y-5 shadow-sm">
          <!-- Guide Section -->
          <div class="p-4 rounded-xl bg-n-solid-1 border border-n-weak space-y-2">
            <h4 class="text-sm font-bold text-n-slate-12 flex items-center gap-2">
              <span>🚀 Lấy File Cookie từ oa.zalo.me bằng J2TEAM Cookies</span>
            </h4>
            <ol class="text-xs text-n-slate-11 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Mở Chrome ➔ Đảm bảo đã cài Extension <b>J2TEAM Cookies</b></li>
              <li>Mở trang <a href="https://oa.zalo.me/chat" target="_blank" rel="noopener noreferrer" class="text-n-blue-11 underline font-medium">https://oa.zalo.me/chat</a> (Zalo OA Chat Web)</li>
              <li>Bấm icon <b>J2TEAM Cookies</b> ➔ Bấm <b>Export Cookies</b> để tải file <code>.json</code> về máy</li>
              <li>Bấm nút <b>Choose File</b> bên dưới ➔ Chọn file <code>.json</code> vừa tải ➔ Bấm <b>🔌 Đăng nhập Zalo OA Web</b></li>
            </ol>
          </div>

          <div class="space-y-4">
            <h4 class="text-sm font-bold text-n-slate-12 flex items-center gap-2">
              <span>🔑 Import File J2TEAM JSON</span>
            </h4>

            <!-- File Upload Box -->
            <div class="p-4 rounded-xl bg-n-solid-1 border border-dashed border-n-weak space-y-2">
              <label class="block text-xs font-semibold text-n-slate-12">
                📂 Tải lên File JSON từ J2TEAM Cookies
              </label>
              <div class="flex items-center gap-3">
                <input
                  ref="j2teamFileInput"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="handleJ2TeamFileUpload"
                />
                <button
                  type="button"
                  class="px-4 py-2 text-xs font-semibold bg-n-solid-3 hover:bg-n-solid-4 border border-n-weak rounded-xl text-n-slate-12 transition-colors flex items-center gap-2"
                  @click="$refs.j2teamFileInput.click()"
                >
                  <span>Choose File</span>
                </button>
                <span class="text-xs text-n-slate-11 font-mono">
                  {{ selectedJ2TeamFileName || 'No file chosen' }}
                </span>
              </div>
            </div>

            <!-- Textarea JSON / Header String -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-n-slate-12">
                Hoặc Dán Nội Dung JSON / Header String
              </label>
              <textarea
                v-model="zaloOaCookie"
                rows="4"
                class="w-full p-3 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm font-mono focus:outline-none focus:border-n-blue-9"
                placeholder="Nội dung file JSON J2TEAM Cookies sẽ hiển thị ở đây..."
              />
            </div>

            <!-- IMEI Field -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-n-slate-12">
                Zalo OA IMEI (Giả lập thiết bị, nếu trống hệ thống tự sinh mã)
              </label>
              <input
                v-model="zaloOaImei"
                type="text"
                class="w-full px-3 py-2 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm focus:outline-none focus:border-n-blue-9"
                placeholder="zalo_oa_imei_xxx"
              />
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <NextButton
                label="🔌 Đăng nhập Zalo OA Web"
                type="button"
                class="w-full justify-center"
                @click="connectZaloOaCookie"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-n-weak">
          <NextButton
            label="Lưu Cấu Hình Zalo OA Hybrid"
            :is-loading="isUpdatingZalo"
            @click="updateZaloCredentials('hybrid')"
          />
        </div>
      </div>

      <!-- TAB 2: ZALO CÁ NHÂN (ZCA BRIDGE) -->
      <div v-else-if="activeZaloTab === 'personal'" class="space-y-6 pt-2">
        <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <b>💡 Phương thức 2: Zalo Cá Nhân (ZCA Personal Bridge)</b><br />
          Tích hợp tài khoản Zalo cá nhân vào Chatwoot. Quét mã QR bên dưới bằng ứng dụng Zalo cá nhân để kết nối nhận & trả lời tin nhắn trực tiếp.
        </div>

        <SettingsFieldSection
          label="Địa chỉ Cầu nối Zalo Cá Nhân (Bridge URL)"
          help-text="URL của dịch vụ zalo_personal_bridge (mặc định: http://localhost:5001 hoặc /zalo-personal/)"
        >
          <input
            v-model="zaloPersonalBridgeUrl"
            type="text"
            class="w-full px-3 py-2 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm focus:outline-none focus:border-n-blue-9"
            placeholder="http://localhost:5001"
          />
        </SettingsFieldSection>

        <div class="w-full rounded-2xl overflow-hidden border border-n-weak bg-n-solid-1 p-2">
          <iframe
            :src="zaloPersonalBridgeUrl || 'http://localhost:5001'"
            class="w-full h-[520px] border-none rounded-xl"
            title="Cầu nối Zalo Cá Nhân"
          />
        </div>

        <SettingsFieldSection
          label="Webhook Callback Zalo Cá Nhân"
          help-text="URL webhook nội bộ kết nối bridge Zalo cá nhân với Chatwoot"
        >
          <woot-code script="http://zalo_personal_bridge:5001/chatwoot-webhook" lang="html" />
        </SettingsFieldSection>

        <div class="flex justify-end pt-4 border-t border-n-weak">
          <NextButton
            label="Lưu Cấu Hình Zalo Cá Nhân"
            :is-loading="isUpdatingZalo"
            @click="updateZaloCredentials('personal')"
          />
        </div>
      </div>

      <!-- TAB 3: ZALO OA OFFICIAL OPENAPI -->
      <div v-else-if="activeZaloTab === 'official'" class="space-y-4 pt-2">
        <div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 leading-relaxed mb-4">
          <b>💡 Phương thức 3: Zalo Official OpenAPI v3.0</b><br />
          Dành cho các tài khoản Zalo OA Doanh Nghiệp đã mua gói API chính thức từ Zalo Developers. Nhập các thông số App ID, Secret Key và Refresh Token để tự động đổi Token 24/7.
        </div>

        <SettingsFieldSection
          label="Zalo OA ID"
          help-text="Mã định danh Zalo Official Account"
        >
          <input
            v-model="zaloOaId"
            type="text"
            class="w-full px-3 py-2 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm focus:outline-none focus:border-n-blue-9"
            :placeholder="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.OA_ID')"
          />
        </SettingsFieldSection>

        <SettingsFieldSection
          label="Zalo App ID"
          help-text="App ID trên trang developer.zalo.me"
        >
          <input
            v-model="zaloAppId"
            type="text"
            class="w-full px-3 py-2 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm focus:outline-none focus:border-n-blue-9"
            :placeholder="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.APP_ID')"
          />
        </SettingsFieldSection>

        <SettingsFieldSection
          label="Zalo App Secret Key"
          help-text="Mã bảo mật App Secret Key dùng để tự động đổi Token"
        >
          <input
            v-model="zaloAppSecret"
            type="password"
            class="w-full px-3 py-2 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm focus:outline-none focus:border-n-blue-9"
            :placeholder="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.APP_SECRET')"
          />
        </SettingsFieldSection>

        <SettingsFieldSection
          label="Zalo Refresh Token"
          help-text="Refresh Token thu được từ Zalo OAuth để tự động gia hạn Token 24/7"
        >
          <textarea
            v-model="zaloRefreshToken"
            rows="2"
            class="w-full p-3 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm font-mono focus:outline-none focus:border-n-blue-9"
            :placeholder="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.REFRESH_TOKEN')"
          />
        </SettingsFieldSection>

        <SettingsFieldSection
          label="Zalo Access Token"
          help-text="Dán Access Token hiện tại (hệ thống sẽ tự động đổi mới khi hết hạn)"
        >
          <textarea
            v-model="zaloAccessToken"
            rows="3"
            class="w-full p-3 border border-n-weak rounded-xl bg-n-solid-1 text-n-slate-12 text-sm font-mono focus:outline-none focus:border-n-blue-9"
            :placeholder="$t('INBOX_MGMT.ADD.ZALO_CHANNEL.PLACEHOLDERS.ACCESS_TOKEN')"
          />
        </SettingsFieldSection>

        <SettingsFieldSection
          label="Zalo Webhook Callback URL"
          help-text="Dán URL này vào mục Webhook trên Zalo Developers"
        >
          <woot-code
            :script="
              inbox.callback_webhook_url ||
              `https://your-domain.com/webhooks/zalo/${inbox.id}`
            "
            lang="html"
          />
        </SettingsFieldSection>

        <div class="flex justify-end pt-4 border-t border-n-weak">
          <NextButton
            label="Lưu Cấu Hình Zalo OpenAPI"
            :is-loading="isUpdatingZalo"
            @click="updateZaloCredentials('official')"
          />
        </div>
      </div>
    </div>

    <SettingsFieldSection
      :label="$t('INBOX_MGMT.SETTINGS_POPUP.INBOX_IDENTIFIER')"
      :help-text="$t('INBOX_MGMT.SETTINGS_POPUP.INBOX_IDENTIFIER_SUB_TEXT')"
    >
      <woot-code :script="inbox.inbox_identifier" />
    </SettingsFieldSection>

    <SettingsFieldSection
      :label="$t('INBOX_MGMT.SETTINGS_POPUP.HMAC_VERIFICATION')"
      :help-text="$t('INBOX_MGMT.SETTINGS_POPUP.HMAC_DESCRIPTION')"
    >
      <woot-code :script="inbox.hmac_token" />
    </SettingsFieldSection>
    <SettingsFieldSection
      :label="$t('INBOX_MGMT.SETTINGS_POPUP.HMAC_MANDATORY_VERIFICATION')"
      :help-text="$t('INBOX_MGMT.SETTINGS_POPUP.HMAC_MANDATORY_DESCRIPTION')"
    >
      <div class="flex gap-2 items-center">
        <input
          id="hmacMandatory"
          v-model="hmacMandatory"
          type="checkbox"
          @change="handleHmacFlag"
        />
        <label for="hmacMandatory" class="text-body-main text-n-slate-12">
          {{ $t('INBOX_MGMT.EDIT.ENABLE_HMAC.LABEL') }}
        </label>
      </div>
    </SettingsFieldSection>
  </div>
  <div v-else-if="isAnEmailChannel">
    <div>
      <SettingsFieldSection
        :label="$t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_TITLE')"
        :help-text="
          isForwardingEnabled
            ? $t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_SUB_TEXT')
            : ''
        "
      >
        <woot-code
          v-if="isForwardingEnabled"
          :script="inbox.forward_to_email"
        />
        <div
          v-else
          class="py-2 px-3 bg-n-amber-3 outline-n-amber-4 text-n-amber-11 outline outline-1 -outline-offset-1 rounded-xl"
        >
          <p class="text-body-para mb-0">
            {{ $t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_NOT_CONFIGURED') }}
          </p>
        </div>
      </SettingsFieldSection>
    </div>
    <ImapSettings :inbox="inbox" />
    <SmtpSettings v-if="inbox.imap_enabled" :inbox="inbox" />
  </div>
  <div v-else-if="isAWhatsAppChannel && !isATwilioChannel">
    <div v-if="inbox.provider_config">
      <!-- Embedded Signup Section -->
      <template v-if="isEmbeddedSignupWhatsApp">
        <SettingsFieldSection
          :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_WEBHOOK_TITLE')"
          :help-text="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_WEBHOOK_SUBHEADER')
          "
        >
          <woot-code :script="inbox.provider_config.webhook_verify_token" />
        </SettingsFieldSection>
        <SettingsFieldSection
          v-if="showWhatsAppReconfigure"
          :label="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_EMBEDDED_SIGNUP_TITLE')
          "
          :help-text="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_EMBEDDED_SIGNUP_DESCRIPTION')
          "
        >
          <NextButton
            :is-loading="isReconfiguring"
            :disabled="isReconfiguring"
            @click="reconfigureWhatsApp"
          >
            {{ $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_RECONFIGURE_BUTTON') }}
          </NextButton>
        </SettingsFieldSection>
      </template>

      <!-- Manual Setup Section -->
      <template v-else-if="!isEmbeddedSignupWhatsApp">
        <SettingsFieldSection
          :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_WEBHOOK_TITLE')"
          :help-text="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_WEBHOOK_SUBHEADER')
          "
        >
          <woot-code :script="inbox.provider_config.webhook_verify_token" />
        </SettingsFieldSection>
        <SettingsFieldSection
          :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_TITLE')"
          :help-text="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_SUBHEADER')
          "
        >
          <woot-code :script="inbox.provider_config.api_key" />
        </SettingsFieldSection>
        <SettingsFieldSection
          :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_UPDATE_TITLE')"
          :help-text="
            $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_UPDATE_SUBHEADER')
          "
        >
          <div
            class="flex flex-1 justify-between items-center whatsapp-settings--content"
          >
            <woot-input
              v-model="whatsAppInboxAPIKey"
              type="text"
              class="flex-1 mr-2 [&>input]:!mb-0"
              :placeholder="
                $t(
                  'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_UPDATE_PLACEHOLDER'
                )
              "
            />
            <NextButton
              :disabled="v$.whatsAppInboxAPIKey.$invalid"
              @click="updateWhatsAppInboxAPIKey"
            >
              {{
                $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_SECTION_UPDATE_BUTTON')
              }}
            </NextButton>
          </div>
        </SettingsFieldSection>
      </template>
      <SettingsFieldSection
        :label="$t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_TITLE')"
        :help-text="
          $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_SUBHEADER')
        "
      >
        <NextButton :disabled="isSyncingTemplates" @click="syncTemplates">
          {{ $t('INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_BUTTON') }}
        </NextButton>
      </SettingsFieldSection>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.whatsapp-settings--content {
  :deep(input) {
    margin-bottom: 0;
  }
}
</style>
