<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const emit = defineEmits(['close', 'imported']);

const { t } = useI18n();
const store = useStore();

const tab = ref('CSV');
const csvText = ref('');
const importing = ref(false);
const importErrors = ref([]);

const accountId = computed(() => store.getters.getCurrentAccountId || 1);
const origin = computed(() =>
  typeof window !== 'undefined' ? window.location.origin : ''
);
const productsEndpoint = computed(
  () =>
    `${origin.value}/api/v1/accounts/${accountId.value}/kchat/pos_sync/products`
);
const ordersEndpoint = computed(
  () =>
    `${origin.value}/api/v1/accounts/${accountId.value}/kchat/pos_sync/orders`
);

const SAMPLE_CSV = [
  'name,category,availability_mode,price,stock,sku,external_id,description,pitch_template,image_url',
  '"Phòng Deluxe Hướng Biển 2N1Đ","Khách sạn","preorder",2400000,,"KS-DLX-01","POS-KS-01","Bao gồm ăn sáng buffet cho 2 người, miễn phí hồ bơi vô cực.","Dạ em gửi phòng {name} giá {price}/đêm ạ. Đã bao gồm buffet sáng.",',
  '"Tour Đà Lạt 3N2Đ trọn gói","Tour","preorder",3290000,,"TOUR-DL-32","POS-TOUR-01","Xe limousine khứ hồi, khách sạn 4 sao trung tâm, vé tham quan.","Anh/chị tham khảo {name} trọn gói {price}/khách nhé ạ.",',
  '"Nước hoa mini 10ml","Mỹ phẩm","in_stock",250000,20,"NH-10ML","POS-NH-10","Hàng có sẵn tại kho giao nhanh 2h nội thành.",,""',
].join('\n');

const SAMPLE_PRODUCTS_JSON = JSON.stringify(
  {
    products: [
      {
        external_id: 'POS-KS-01',
        name: 'Phòng Deluxe Hướng Biển 2N1Đ',
        category: 'Khách sạn',
        availability_mode: 'preorder',
        price: 2400000,
        description: 'Bao gồm ăn sáng cho 2 người',
      },
    ],
  },
  null,
  2
);

const SAMPLE_ORDERS_JSON = JSON.stringify(
  {
    external_id: 'POS-ORD-8891',
    external_source: 'kiotviet',
    external_status: 'Đang giữ phòng',
    status: 'paid',
    customer: { name: 'Chị Lan', phone_number: '+84901234567' },
    items: [{ external_id: 'POS-KS-01', quantity: 1 }],
  },
  null,
  2
);

const downloadSample = () => {
  const blob = new Blob([`\uFEFF${SAMPLE_CSV}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'kalo-san-pham-mau.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const onFilePick = event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    csvText.value = String(reader.result || '');
  };
  reader.readAsText(file);
};

const copyText = async value => {
  await copyTextToClipboard(value);
  useAlert(t('KALO_PRODUCTS.IMPORT.COPIED'));
};

const submitImport = async () => {
  if (!csvText.value.trim() || importing.value) return;
  importing.value = true;
  importErrors.value = [];
  try {
    const result = await store.dispatch('kchatProducts/importProducts', {
      csv_text: csvText.value,
    });
    importErrors.value = result.errors || [];
    useAlert(
      t('KALO_PRODUCTS.IMPORT.SUCCESS', {
        imported: result.imported_count || 0,
        created: result.created_count || 0,
        updated: result.updated_count || 0,
      })
    );
    if ((result.imported_count || 0) > 0 && !importErrors.value.length) {
      emit('imported', result);
    }
  } catch (error) {
    alertKchatError(error, t);
  } finally {
    importing.value = false;
  }
};
</script>

<template>
  <KaloDrawer
    data-test="product-import-drawer"
    :title="t('KALO_PRODUCTS.IMPORT.TITLE')"
    @close="emit('close')"
  >
    <div
      class="inline-flex gap-1 p-1 rounded-xl bg-n-solid-2 border border-n-weak"
    >
      <button
        type="button"
        data-test="import-tab-csv"
        class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
        :class="
          tab === 'CSV'
            ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
            : 'text-n-slate-11 hover:text-n-slate-12'
        "
        @click="tab = 'CSV'"
      >
        {{ t('KALO_PRODUCTS.IMPORT.TAB_CSV') }}
      </button>
      <button
        type="button"
        data-test="import-tab-pos"
        class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
        :class="
          tab === 'POS'
            ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
            : 'text-n-slate-11 hover:text-n-slate-12'
        "
        @click="tab = 'POS'"
      >
        {{ t('KALO_PRODUCTS.IMPORT.TAB_POS') }}
      </button>
    </div>

    <div v-if="tab === 'CSV'" class="flex flex-col gap-3">
      <p class="mb-0 text-xs leading-relaxed text-n-slate-11">
        {{ t('KALO_PRODUCTS.IMPORT.CSV_HINT') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          data-test="import-download-sample"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-2"
          @click="downloadSample"
        >
          <KaloIcon name="arrow" class="size-3.5" />
          {{ t('KALO_PRODUCTS.IMPORT.DOWNLOAD_SAMPLE') }}
        </button>
        <label
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg cursor-pointer border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-2"
        >
          <KaloIcon name="clip" class="size-3.5" />
          {{ t('KALO_PRODUCTS.IMPORT.PICK_FILE') }}
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            data-test="import-file"
            class="sr-only"
            @change="onFilePick"
          />
        </label>
      </div>

      <label class="block text-sm font-semibold text-n-slate-12">
        {{ t('KALO_PRODUCTS.IMPORT.PASTE_LABEL') }}
        <textarea
          v-model="csvText"
          rows="9"
          data-test="import-csv-text"
          class="w-full p-3 mt-1.5 mb-0 font-mono text-xs border border-solid rounded-xl outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand"
        />
      </label>

      <div
        v-if="importErrors.length"
        data-test="import-errors"
        class="p-3 text-xs border rounded-xl border-n-ruby-6/40 bg-n-ruby-3/40 text-n-ruby-11"
      >
        <p class="mb-1 font-semibold">
          {{
            t('KALO_PRODUCTS.IMPORT.PARTIAL_ERRORS', {
              count: importErrors.length,
            })
          }}
        </p>
        <ul class="flex flex-col gap-0.5 ps-4 mb-0">
          <li v-for="err in importErrors" :key="err.row">
            {{ `${err.row}: ${err.message}` }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4 text-xs text-n-slate-12">
      <p class="mb-0 leading-relaxed text-n-slate-11">
        {{ t('KALO_PRODUCTS.IMPORT.POS_INTRO') }}
      </p>

      <div class="p-3 border rounded-xl bg-n-solid-2 border-n-weak">
        <div class="flex items-center justify-between gap-2 font-semibold">
          <span>{{ t('KALO_PRODUCTS.IMPORT.POS_PRODUCTS_ENDPOINT') }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-n-brand hover:underline"
            @click="copyText(productsEndpoint)"
          >
            <KaloIcon name="copy" class="size-3.5" />
          </button>
        </div>
        <code class="block mt-1 break-all text-[11px] text-n-slate-11">
          {{ productsEndpoint }}
        </code>
        <pre
          class="p-2 mt-2 overflow-x-auto text-[11px] rounded-lg bg-n-solid-1 border border-n-weak"
          >{{ SAMPLE_PRODUCTS_JSON }}</pre
        >
      </div>

      <div class="p-3 border rounded-xl bg-n-solid-2 border-n-weak">
        <div class="flex items-center justify-between gap-2 font-semibold">
          <span>{{ t('KALO_PRODUCTS.IMPORT.POS_ORDERS_ENDPOINT') }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-n-brand hover:underline"
            @click="copyText(ordersEndpoint)"
          >
            <KaloIcon name="copy" class="size-3.5" />
          </button>
        </div>
        <code class="block mt-1 break-all text-[11px] text-n-slate-11">
          {{ ordersEndpoint }}
        </code>
        <pre
          class="p-2 mt-2 overflow-x-auto text-[11px] rounded-lg bg-n-solid-1 border border-n-weak"
          >{{ SAMPLE_ORDERS_JSON }}</pre
        >
      </div>

      <div class="p-3 border rounded-xl bg-n-solid-2 border-n-weak">
        <div class="font-semibold">
          {{ t('KALO_PRODUCTS.IMPORT.POS_WEBHOOK_TITLE') }}
        </div>
        <p class="mt-1 mb-0 leading-relaxed text-n-slate-11">
          {{ t('KALO_PRODUCTS.IMPORT.POS_WEBHOOK_DESC') }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
          @click="emit('close')"
        >
          {{ t('KALO_PRODUCTS.FORM.CANCEL') }}
        </button>
        <button
          v-if="tab === 'CSV'"
          type="button"
          data-test="import-submit"
          :disabled="importing || !csvText.trim()"
          class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          @click="submitImport"
        >
          {{
            t(
              importing
                ? 'KALO_PRODUCTS.IMPORT.IMPORTING'
                : 'KALO_PRODUCTS.IMPORT.SUBMIT'
            )
          }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
