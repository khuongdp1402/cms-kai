<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { formatVnd } from 'dashboard/helper/formatVnd';
import botConfigAPI from 'dashboard/api/kchat/botConfig';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';

const { t } = useI18n();
const store = useStore();
const CONTACT_NAME_TOKEN = '{{contact.name}}';

const loading = ref(true);
const saving = ref(false);
const config = ref({
  enabled: false,
  pause_when_agent_active: true,
  welcome_enabled: true,
  welcome_message: '',
  auto_suggest_products: true,
  handoff_enabled: false,
  handoff_message: '',
  rules: [],
});

const products = computed(() => {
  const list = store.getters?.['kchatProducts/getProducts'];
  return Array.isArray(list) ? list : [];
});

const PRESETS = {
  hotel: {
    name: 'Tư vấn đặt phòng Khách sạn',
    keywords: 'khách sạn, phòng, resort, check-in, nhận phòng',
    reply:
      'Dạ chào {{contact.name}}, bên em gửi anh/chị thông tin các hạng phòng & giá ưu đãi hiện có ạ. Anh/chị cho em xin ngày nhận/trả phòng và số lượng người để em giữ phòng tốt nhất nhé!',
    labels: 'khach_san, can_tu_van',
  },
  tour: {
    name: 'Tư vấn Tour du lịch',
    keywords: 'tour, lịch trình, du lịch, đi chơi',
    reply:
      'Dạ chào {{contact.name}}, anh/chị đang quan tâm tour đi ngày nào và đoàn mình mấy người để em gửi lịch trình chi tiết kèm giá ưu đãi ạ?',
    labels: 'tour, can_tu_van',
  },
  flight: {
    name: 'Hỗ trợ Vé máy bay',
    keywords: 'vé máy bay, chuyến bay, bay, khứ hồi, hành lý',
    reply:
      'Dạ chào {{contact.name}}, anh/chị cho em xin chặng bay (đi từ đâu - đến đâu), ngày đi/về và số hành khách để em kiểm tra giá vé tốt nhất ngay ạ!',
    labels: 've_may_bay, can_tu_van',
  },
};

const toEditableRule = rule => ({
  id: rule.id || `rule-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  name: rule.name || '',
  active: rule.active !== false,
  keywordsText: Array.isArray(rule.keywords)
    ? rule.keywords.join(', ')
    : String(rule.keywords || ''),
  reply: rule.reply || '',
  product_ids: Array.isArray(rule.product_ids) ? [...rule.product_ids] : [],
  labelsText: Array.isArray(rule.assign_labels)
    ? rule.assign_labels.join(', ')
    : String(rule.assign_labels || ''),
});

const load = async () => {
  loading.value = true;
  try {
    const requests = [botConfigAPI.getConfig()];
    if (store.hasModule?.('kchatProducts')) {
      requests.push(store.dispatch('kchatProducts/fetch', { active: true }));
    }
    const [res] = await Promise.all(requests);
    const data = res.data || {};
    config.value = {
      enabled: Boolean(data.enabled),
      pause_when_agent_active: data.pause_when_agent_active !== false,
      welcome_enabled: data.welcome_enabled !== false,
      welcome_message: data.welcome_message || '',
      auto_suggest_products: data.auto_suggest_products !== false,
      handoff_enabled: Boolean(data.handoff_enabled),
      handoff_message: data.handoff_message || '',
      rules: Array.isArray(data.rules) ? data.rules.map(toEditableRule) : [],
    };
  } catch {
    useAlert(t('KALO_BOT.LOAD_ERROR'));
  } finally {
    loading.value = false;
  }
};

const addEmptyRule = () => {
  config.value.rules.push(
    toEditableRule({ name: '', keywords: [], reply: '', product_ids: [] })
  );
};

const addPreset = key => {
  const preset = PRESETS[key];
  if (!preset) return;
  config.value.rules.push(
    toEditableRule({
      name: preset.name,
      keywords: preset.keywords,
      reply: preset.reply,
      assign_labels: preset.labels,
    })
  );
};

const removeRule = idx => {
  config.value.rules.splice(idx, 1);
};

const toggleRuleProduct = (rule, productId) => {
  if (rule.product_ids.includes(productId)) {
    rule.product_ids = rule.product_ids.filter(id => id !== productId);
  } else {
    rule.product_ids = [...rule.product_ids, productId];
  }
};

const splitCsv = text =>
  String(text || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const save = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload = {
      enabled: config.value.enabled,
      pause_when_agent_active: config.value.pause_when_agent_active,
      welcome_enabled: config.value.welcome_enabled,
      welcome_message: config.value.welcome_message,
      auto_suggest_products: config.value.auto_suggest_products,
      handoff_enabled: config.value.handoff_enabled,
      handoff_message: config.value.handoff_message,
      rules: config.value.rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        active: rule.active,
        keywords: splitCsv(rule.keywordsText),
        reply: rule.reply,
        product_ids: rule.product_ids,
        assign_labels: splitCsv(rule.labelsText),
      })),
    };
    const { data } = await botConfigAPI.updateConfig(payload);
    config.value.rules = Array.isArray(data.rules)
      ? data.rules.map(toEditableRule)
      : [];
    useAlert(t('KALO_BOT.SAVED'));
  } catch {
    useAlert(t('KALO_BOT.SAVE_ERROR'));
  } finally {
    saving.value = false;
  }
};

onMounted(load);

const inputClass =
  'w-full px-3 py-2 mt-1 mb-0 text-sm border border-solid rounded-[10px] outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15';
const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2';
</script>

<template>
  <KaloPage :title="t('KALO_BOT.TITLE')" :description="t('KALO_BOT.DESC')">
    <template #leading>
      <router-link
        :to="{ name: 'kalo_settings_hub' }"
        :aria-label="t('KALO_BOT.BACK')"
        :title="t('KALO_BOT.BACK')"
        class="inline-flex items-center justify-center border size-9 shrink-0 rounded-[10px] border-n-weak text-n-slate-11 hover:bg-n-alpha-2"
      >
        <KaloIcon name="back" class="size-4" />
      </router-link>
    </template>
    <template #actions>
      <button
        type="button"
        data-test="bot-save"
        :disabled="loading || saving"
        class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
        @click="save"
      >
        <KaloIcon name="check" class="size-4" />
        {{ t('KALO_BOT.SAVE') }}
      </button>
    </template>

    <KaloCard :title="t('KALO_BOT.GENERAL_TITLE')">
      <div class="flex flex-col gap-3.5 text-sm text-n-slate-12">
        <label
          class="inline-flex items-center gap-2.5 font-semibold cursor-pointer"
        >
          <input
            v-model="config.enabled"
            type="checkbox"
            data-test="bot-enabled"
            class="mb-0"
          />
          <span>{{ t('KALO_BOT.ENABLED') }}</span>
        </label>

        <label
          class="inline-flex items-center gap-2.5 cursor-pointer text-n-slate-11"
        >
          <input
            v-model="config.pause_when_agent_active"
            type="checkbox"
            class="mb-0"
          />
          <span>{{ t('KALO_BOT.PAUSE_ON_AGENT') }}</span>
        </label>

        <label
          class="inline-flex items-center gap-2.5 cursor-pointer text-n-slate-11"
        >
          <input
            v-model="config.auto_suggest_products"
            type="checkbox"
            data-test="bot-auto-suggest"
            class="mb-0"
          />
          <span>{{ t('KALO_BOT.AUTO_SUGGEST') }}</span>
        </label>

        <div class="pt-2 border-t border-n-weak">
          <label
            class="inline-flex items-center gap-2.5 font-medium cursor-pointer"
          >
            <input
              v-model="config.welcome_enabled"
              type="checkbox"
              class="mb-0"
            />
            <span>{{ t('KALO_BOT.WELCOME_ENABLED') }}</span>
          </label>
          <label
            v-if="config.welcome_enabled"
            class="block mt-2 text-xs font-semibold text-n-slate-11"
          >
            {{ t('KALO_BOT.WELCOME_MESSAGE') }}
            <textarea
              v-model="config.welcome_message"
              rows="2"
              data-test="bot-welcome-message"
              :class="inputClass"
            />
          </label>
        </div>

        <div class="pt-2 border-t border-n-weak">
          <label
            class="inline-flex items-center gap-2.5 font-medium cursor-pointer"
          >
            <input
              v-model="config.handoff_enabled"
              type="checkbox"
              class="mb-0"
            />
            <span>{{ t('KALO_BOT.HANDOFF_ENABLED') }}</span>
          </label>
          <label
            v-if="config.handoff_enabled"
            class="block mt-2 text-xs font-semibold text-n-slate-11"
          >
            {{ t('KALO_BOT.HANDOFF_MESSAGE') }}
            <input
              v-model="config.handoff_message"
              type="text"
              :class="inputClass"
            />
          </label>
        </div>
      </div>
    </KaloCard>

    <KaloCard :title="t('KALO_BOT.RULES_TITLE')">
      <template #actions>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-test="bot-preset-hotel"
            :class="secondaryButton"
            @click="addPreset('hotel')"
          >
            {{ t('KALO_BOT.ADD_PRESET_HOTEL') }}
          </button>
          <button
            type="button"
            data-test="bot-preset-tour"
            :class="secondaryButton"
            @click="addPreset('tour')"
          >
            {{ t('KALO_BOT.ADD_PRESET_TOUR') }}
          </button>
          <button
            type="button"
            data-test="bot-preset-flight"
            :class="secondaryButton"
            @click="addPreset('flight')"
          >
            {{ t('KALO_BOT.ADD_PRESET_FLIGHT') }}
          </button>
          <button
            type="button"
            data-test="bot-add-rule"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-woot-500 hover:bg-woot-600"
            @click="addEmptyRule"
          >
            <KaloIcon name="plus" class="size-3.5" />
            {{ t('KALO_BOT.ADD_RULE') }}
          </button>
        </div>
      </template>

      <p class="mb-4 text-xs text-n-slate-11">
        {{ t('KALO_BOT.RULES_DESC') }}
      </p>

      <p
        v-if="!config.rules.length"
        data-test="bot-rules-empty"
        class="py-8 mb-0 text-sm text-center text-n-slate-11"
      >
        {{ t('KALO_BOT.RULE_EMPTY') }}
      </p>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="(rule, index) in config.rules"
          :key="rule.id"
          data-test="bot-rule-card"
          class="flex flex-col gap-3 p-4 border rounded-xl border-n-weak bg-n-solid-2"
        >
          <div class="flex items-center justify-between gap-2">
            <label class="flex-1 text-xs font-semibold text-n-slate-12">
              {{ t('KALO_BOT.RULE_NAME') }}
              <input
                v-model="rule.name"
                type="text"
                data-test="bot-rule-name"
                :class="inputClass"
              />
            </label>
            <button
              type="button"
              data-test="bot-rule-remove"
              class="self-end px-3 py-2 text-xs font-semibold border rounded-lg border-n-weak text-n-ruby-11 hover:bg-n-ruby-2"
              @click="removeRule(index)"
            >
              {{ t('KALO_BOT.RULE_REMOVE') }}
            </button>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="text-xs font-semibold text-n-slate-12">
              {{ t('KALO_BOT.RULE_KEYWORDS') }}
              <input
                v-model="rule.keywordsText"
                type="text"
                data-test="bot-rule-keywords"
                :placeholder="t('KALO_BOT.RULE_KEYWORDS_PLACEHOLDER')"
                :class="inputClass"
              />
            </label>
            <label class="text-xs font-semibold text-n-slate-12">
              {{ t('KALO_BOT.RULE_LABELS') }}
              <input
                v-model="rule.labelsText"
                type="text"
                data-test="bot-rule-labels"
                :placeholder="t('KALO_BOT.RULE_LABELS_PLACEHOLDER')"
                :class="inputClass"
              />
            </label>
          </div>

          <label class="text-xs font-semibold text-n-slate-12">
            {{ t('KALO_BOT.RULE_REPLY') }}
            <textarea
              v-model="rule.reply"
              rows="2"
              data-test="bot-rule-reply"
              :class="inputClass"
            />
            <span class="block mt-1 font-normal text-n-slate-11">
              {{ t('KALO_BOT.RULE_REPLY_HINT', { token: CONTACT_NAME_TOKEN }) }}
            </span>
          </label>

          <div v-if="products.length" class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-n-slate-12">
              {{ t('KALO_BOT.RULE_PRODUCTS') }}
            </span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="product in products"
                :key="product.id"
                type="button"
                data-test="bot-rule-product"
                class="px-2.5 py-1 text-xs font-medium border rounded-full transition-colors"
                :class="
                  rule.product_ids.includes(product.id)
                    ? 'bg-n-brand text-white border-transparent'
                    : 'bg-n-solid-1 border-n-weak text-n-slate-11 hover:text-n-slate-12'
                "
                @click="toggleRuleProduct(rule, product.id)"
              >
                {{ `${product.name} · ${formatVnd(product.price)}` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </KaloCard>
  </KaloPage>
</template>
