import KchatProductsAPI from '../../../api/kchat/products';

const SET_UI_FLAG = 'KCHAT_PRODUCTS_SET_UI_FLAG';
const SET_PRODUCTS = 'KCHAT_PRODUCTS_SET';
const UPSERT_PRODUCT = 'KCHAT_PRODUCTS_UPSERT';
const REMOVE_PRODUCT = 'KCHAT_PRODUCTS_REMOVE';

export const createState = () => ({
  records: [],
  meta: {},
  uiFlags: { isFetching: false, isCreating: false, isUpdating: false },
});

export const getters = {
  getProducts: $state => $state.records,
  getMeta: $state => $state.meta,
  getUIFlags: $state => $state.uiFlags,
};

const withFlag = async ({ commit }, flag, run) => {
  commit(SET_UI_FLAG, { [flag]: true });
  try {
    return await run();
  } finally {
    commit(SET_UI_FLAG, { [flag]: false });
  }
};

// Only the latest fetch may commit: the POS search is debounced but overlaps.
let latestFetch = 0;

export const actions = {
  fetch: async (
    { commit },
    { query, active, category, availabilityMode } = {}
  ) => {
    latestFetch += 1;
    const requestId = latestFetch;
    commit(SET_UI_FLAG, { isFetching: true });
    try {
      const { data } = await KchatProductsAPI.get({
        query,
        active,
        category,
        availabilityMode,
      });
      if (requestId === latestFetch) commit(SET_PRODUCTS, data);
    } finally {
      if (requestId === latestFetch) commit(SET_UI_FLAG, { isFetching: false });
    }
  },

  importProducts: ({ commit, dispatch }, payload) =>
    withFlag({ commit }, 'isCreating', async () => {
      const { data } = await KchatProductsAPI.importProducts(payload);
      await dispatch('fetch', { active: true });
      return data;
    }),

  create: ({ commit }, payload) =>
    withFlag({ commit }, 'isCreating', async () => {
      const { data } = await KchatProductsAPI.create(payload);
      commit(UPSERT_PRODUCT, data);
      return data;
    }),

  // `formData` (image upload) is sent as is instead of the other fields.
  update: ({ commit }, { id, formData, ...payload }) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { data } = await KchatProductsAPI.update(id, formData || payload);
      commit(UPSERT_PRODUCT, data);
      return data;
    }),

  // The backend deletes a product no order uses (204) and archives the others (200, active: false).
  archive: ({ commit }, id) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { status, data } = await KchatProductsAPI.delete(id);
      if (status === 204) {
        commit(REMOVE_PRODUCT, id);
        return { deleted: true };
      }
      commit(UPSERT_PRODUCT, data);
      return { deleted: false };
    }),

  adjustStock: ({ commit }, { id, delta }) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { data } = await KchatProductsAPI.adjustStock(id, delta);
      commit(UPSERT_PRODUCT, data);
      return data;
    }),
};

export const mutations = {
  [SET_UI_FLAG]($state, flags) {
    $state.uiFlags = { ...$state.uiFlags, ...flags };
  },
  [SET_PRODUCTS]($state, { payload, meta }) {
    $state.records = payload;
    $state.meta = meta;
  },
  [UPSERT_PRODUCT]($state, product) {
    const exists = $state.records.some(record => record.id === product.id);
    $state.records = exists
      ? $state.records.map(record =>
          record.id === product.id ? product : record
        )
      : [...$state.records, product];
  },
  [REMOVE_PRODUCT]($state, id) {
    $state.records = $state.records.filter(record => record.id !== id);
  },
};

export default {
  namespaced: true,
  state: createState,
  getters,
  actions,
  mutations,
};
