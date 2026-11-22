<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useOneShotQueryFlag } from 'dashboard/composables/useOneShotQueryFlag';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import { useShopAdmin } from 'dashboard/components-next/guide/useShopAdmin';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import ProductFormDrawer from './ProductFormDrawer.vue';
import ProductImportDrawer from './ProductImportDrawer.vue';
import StockAdjustDrawer from './StockAdjustDrawer.vue';

// Sales catalog: retail stock, booking/pre-order items, and custom services.
const FILTERS = [
  { key: 'ACTIVE', active: true },
  { key: 'ARCHIVED', active: false },
  { key: 'ALL', active: undefined },
];
const LOW_STOCK = 3;

const { t } = useI18n();
const store = useStore();
const { isOn } = useKaloFeatures();
const { isAdmin } = useShopAdmin();
const isPosOn = computed(() => isOn(FEATURE_FLAGS.KALO_POS));

const filter = ref(FILTERS[0]);
const query = ref('');
const editing = ref(useOneShotQueryFlag('new') ? { product: null } : null);
const showImport = ref(false);
const adjusting = ref(null);
const archiving = ref(null);
let searchTimer = null;

const products = computed(() => store.getters['kchatProducts/getProducts']);
const uiFlags = computed(() => store.getters['kchatProducts/getUIFlags']);
const isEmpty = computed(
  () =>
    !uiFlags.value.isFetching &&
    !products.value.length &&
    !query.value &&
    filter.value.key === 'ACTIVE'
);

const load = () =>
  store.dispatch('kchatProducts/fetch', {
    query: query.value || undefined,
    active: filter.value.active,
  });

const chooseFilter = item => {
  filter.value = item;
  load();
};

const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
};

const isStockMode = product =>
  !product.availability_mode || product.availability_mode === 'in_stock';

const stockLabel = product => {
  if (!isStockMode(product)) {
    return t(`KALO_PRODUCTS.AVAILABILITY.${product.availability_mode}`);
  }
  if (product.stock === null || product.stock === undefined) {
    return t('KALO_PRODUCTS.STOCK.UNTRACKED');
  }
  if (product.stock <= 0) return t('KALO_PRODUCTS.STOCK.OUT');
  return t('KALO_PRODUCTS.STOCK.LEFT', { count: product.stock });
};
const stockClass = product => {
  if (!isStockMode(product)) {
    return 'text-n-blue-11 font-medium';
  }
  if (product.stock === null || product.stock === undefined) {
    return 'text-n-slate-11';
  }
  if (product.stock <= 0) return 'text-n-ruby-11 font-semibold';
  return product.stock <= LOW_STOCK
    ? 'text-n-amber-11 font-semibold'
    : 'text-n-slate-12';
};

const openCreate = () => {
  editing.value = { product: null };
};
const openEdit = product => {
  editing.value = { product };
};
const onSaved = () => {
  editing.value = null;
  adjusting.value = null;
  load();
};
const onImported = () => {
  showImport.value = false;
  load();
};

const restore = async product => {
  try {
    await store.dispatch('kchatProducts/update', {
      id: product.id,
      active: true,
    });
    useAlert(t('KALO_PRODUCTS.TOAST.RESTORED'));
    load();
  } catch (error) {
    alertKchatError(error, t);
  }
};

const confirmArchive = async () => {
  const product = archiving.value;
  archiving.value = null;
  try {
    const { deleted } = await store.dispatch(
      'kchatProducts/archive',
      product.id
    );
    useAlert(
      t(
        deleted ? 'KALO_PRODUCTS.TOAST.DELETED' : 'KALO_PRODUCTS.TOAST.ARCHIVED'
      )
    );
    load();
  } catch (error) {
    alertKchatError(error, t);
  }
};

const onKeydown = event => {
  if (event.key === 'Escape' && archiving.value) archiving.value = null;
};

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  load();
});
onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  document.removeEventListener('keydown', onKeydown);
});

const secondaryButton =
  'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2';
const primaryButton =
  'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600';
const rowButtonBase =
  'px-2.5 py-1.5 text-xs font-semibold border rounded-lg border-n-weak hover:bg-n-alpha-2 whitespace-nowrap';
const rowButton = `${rowButtonBase} text-n-slate-12`;
const rowButtonDanger = `${rowButtonBase} text-n-ruby-11`;
</script>

<template>
  <KaloPage
    :title="t('KALO_PRODUCTS.TITLE')"
    :description="t('KALO_PRODUCTS.DESCRIPTION')"
  >
    <template #leading>
      <router-link
        :to="{ name: 'kalo_orders' }"
        data-test="products-back"
        :aria-label="t('KALO_PRODUCTS.BACK')"
        :title="t('KALO_PRODUCTS.BACK')"
        class="inline-flex items-center justify-center border size-9 shrink-0 rounded-[10px] border-n-weak text-n-slate-11 hover:bg-n-alpha-2"
      >
        <KaloIcon name="back" class="size-4" />
      </router-link>
    </template>
    <template #actions>
      <router-link
        v-if="isPosOn"
        :to="{ name: 'kalo_pos' }"
        data-test="products-open-pos"
        :class="secondaryButton"
      >
        <KaloIcon name="store" class="size-4" />
        {{ t('KALO_PRODUCTS.OPEN_POS') }}
      </router-link>
      <router-link
        v-if="isAdmin"
        :to="{ name: 'kalo_bot_settings' }"
        data-test="products-bot"
        :class="secondaryButton"
      >
        <KaloIcon name="spark" class="size-4" />
        {{ t('KALO_PRODUCTS.BOT_CONFIG') }}
      </router-link>
      <button
        v-if="isAdmin"
        type="button"
        data-test="products-import"
        :class="secondaryButton"
        @click="showImport = true"
      >
        <KaloIcon name="arrow" class="size-4" />
        {{ t('KALO_PRODUCTS.IMPORT_POS') }}
      </button>
      <button
        v-if="isAdmin && !isEmpty"
        type="button"
        data-test="products-create"
        data-tour="products-create"
        :class="primaryButton"
        @click="openCreate"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_PRODUCTS.CREATE') }}
      </button>
    </template>

    <p
      v-if="!isAdmin"
      data-test="products-read-only"
      class="px-4 py-3 text-sm border rounded-xl bg-n-solid-2 border-n-weak text-n-slate-11"
    >
      {{ t('KALO_PRODUCTS.READ_ONLY') }}
    </p>

    <KaloCard flush data-tour="products-table">
      <div
        data-tour="products-search"
        class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-n-solid-2 border-n-weak"
      >
        <div class="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-n-solid-3">
          <button
            v-for="item in FILTERS"
            :key="item.key"
            type="button"
            :data-test="`products-filter-${item.key.toLowerCase()}`"
            :aria-pressed="filter.key === item.key"
            class="px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
            :class="
              filter.key === item.key
                ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
                : 'text-n-slate-11 hover:text-n-slate-12'
            "
            @click="chooseFilter(item)"
          >
            {{ t(`KALO_PRODUCTS.FILTERS.${item.key}`) }}
          </button>
        </div>
        <input
          v-model="query"
          type="search"
          data-test="products-search"
          :aria-label="t('KALO_PRODUCTS.SEARCH')"
          :placeholder="t('KALO_PRODUCTS.SEARCH')"
          class="w-full h-9 px-3 py-1.5 mb-0 text-sm border rounded-[10px] outline-none sm:w-72 border-n-strong bg-n-solid-1 text-n-slate-12 hover:border-n-slate-6 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15"
          @input="onSearch"
        />
      </div>

      <div
        v-if="isEmpty"
        data-test="products-empty"
        class="flex flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <p class="max-w-md text-sm text-n-slate-11">
          {{
            t(
              isAdmin
                ? 'KALO_PRODUCTS.EMPTY.ADMIN'
                : 'KALO_PRODUCTS.EMPTY.AGENT'
            )
          }}
        </p>
        <button
          v-if="isAdmin"
          type="button"
          data-test="products-empty-create"
          data-tour="products-create"
          :class="primaryButton"
          @click="openCreate"
        >
          <KaloIcon name="plus" class="size-4" />
          {{ t('KALO_PRODUCTS.CREATE') }}
        </button>
      </div>

      <p
        v-else-if="!uiFlags.isFetching && !products.length"
        data-test="products-no-results"
        class="px-4 py-12 text-sm text-center text-n-slate-11"
      >
        {{ t('KALO_PRODUCTS.NO_RESULTS') }}
      </p>

      <ul v-else class="divide-y divide-n-weak">
        <li
          class="hidden px-4 py-2 text-xs font-semibold uppercase md:grid md:grid-cols-[minmax(0,1fr)_8rem_10rem_8rem_16rem] md:gap-4 bg-n-solid-2 text-n-slate-11"
          aria-hidden="true"
        >
          <span>{{ t('KALO_PRODUCTS.COLUMNS.PRODUCT') }}</span>
          <span class="text-end">{{ t('KALO_PRODUCTS.COLUMNS.PRICE') }}</span>
          <span>{{ t('KALO_PRODUCTS.COLUMNS.STOCK') }}</span>
          <span>{{ t('KALO_PRODUCTS.COLUMNS.STATUS') }}</span>
          <span />
        </li>
        <li
          v-for="product in products"
          :key="product.id"
          data-test="product-row"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_8rem_10rem_8rem_16rem]"
        >
          <div
            class="flex items-center flex-1 min-w-0 gap-3 basis-full md:basis-auto"
          >
            <div class="overflow-hidden size-11 shrink-0 rounded-[10px]">
              <KaloProductThumb
                :name="product.name"
                :image-url="product.image_url"
              />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate text-n-slate-12">
                {{ product.name }}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span
                  v-if="product.category"
                  data-test="product-category"
                  class="px-1.5 py-0.5 text-[11px] font-medium rounded bg-n-solid-2 border border-n-weak text-n-slate-11"
                >
                  {{ product.category }}
                </span>
                <span
                  v-if="product.sku"
                  class="text-xs truncate text-n-slate-11"
                >
                  {{ t('KALO_PRODUCTS.SKU', { sku: product.sku }) }}
                </span>
              </div>
            </div>
          </div>
          <span
            data-test="product-price"
            class="text-sm font-bold md:text-end text-n-slate-12 tabular-nums"
          >
            {{ formatVnd(product.price) }}
          </span>
          <span
            data-test="product-stock"
            class="text-sm tabular-nums"
            :class="stockClass(product)"
          >
            {{ stockLabel(product) }}
          </span>
          <span>
            <span
              data-test="product-status"
              class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
              :class="
                product.active
                  ? 'bg-n-teal-3 text-n-teal-11'
                  : 'bg-n-solid-3 text-n-slate-11'
              "
            >
              {{
                t(
                  product.active
                    ? 'KALO_PRODUCTS.STATUS.ACTIVE'
                    : 'KALO_PRODUCTS.STATUS.ARCHIVED'
                )
              }}
            </span>
          </span>
          <div
            v-if="isAdmin"
            class="flex flex-wrap justify-end gap-1.5 ms-auto md:ms-0"
          >
            <button
              type="button"
              data-test="product-edit"
              :class="rowButton"
              @click="openEdit(product)"
            >
              {{ t('KALO_PRODUCTS.ACTIONS.EDIT') }}
            </button>
            <template v-if="product.active">
              <button
                v-if="isStockMode(product)"
                type="button"
                data-test="product-adjust"
                :class="rowButton"
                @click="adjusting = product"
              >
                {{ t('KALO_PRODUCTS.ACTIONS.ADJUST') }}
              </button>
              <button
                type="button"
                data-test="product-archive"
                :class="rowButtonDanger"
                @click="archiving = product"
              >
                {{ t('KALO_PRODUCTS.ACTIONS.ARCHIVE') }}
              </button>
            </template>
            <button
              v-else
              type="button"
              data-test="product-restore"
              :class="rowButton"
              @click="restore(product)"
            >
              {{ t('KALO_PRODUCTS.ACTIONS.RESTORE') }}
            </button>
          </div>
        </li>
      </ul>
    </KaloCard>

    <ProductFormDrawer
      v-if="editing && isAdmin"
      :key="editing.product?.id || 'new'"
      :product="editing.product"
      @close="editing = null"
      @saved="onSaved"
    />
    <ProductImportDrawer
      v-if="showImport && isAdmin"
      @close="showImport = false"
      @imported="onImported"
    />
    <StockAdjustDrawer
      v-if="adjusting"
      :product="adjusting"
      @close="adjusting = null"
      @saved="onSaved"
    />

    <div
      v-if="archiving"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgb(20_15_13/0.44)] backdrop-blur-[3px]"
      @click.self="archiving = null"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kalo-archive-title"
        data-test="archive-dialog"
        class="w-full max-w-sm p-5 border shadow-xl rounded-2xl bg-n-solid-1 border-n-weak"
      >
        <h2
          id="kalo-archive-title"
          class="text-base font-extrabold text-n-slate-12"
        >
          {{ t('KALO_PRODUCTS.ARCHIVE_DIALOG.TITLE') }}
        </h2>
        <p class="mt-2 text-sm text-n-slate-11">
          {{ t('KALO_PRODUCTS.ARCHIVE_DIALOG.BODY', { name: archiving.name }) }}
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button
            type="button"
            data-test="archive-cancel"
            class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
            @click="archiving = null"
          >
            {{ t('KALO_PRODUCTS.ARCHIVE_DIALOG.CANCEL') }}
          </button>
          <button
            type="button"
            data-test="archive-confirm"
            class="px-4 py-2 text-sm font-semibold rounded-[10px] bg-n-ruby-3 text-n-ruby-11 hover:bg-n-ruby-4"
            @click="confirmArchive"
          >
            {{ t('KALO_PRODUCTS.ARCHIVE_DIALOG.CONFIRM') }}
          </button>
        </div>
      </div>
    </div>
  </KaloPage>
</template>
