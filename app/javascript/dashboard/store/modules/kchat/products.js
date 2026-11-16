import KchatProductsAPI from '../../../api/kchat/products';

const SET_UI_FLAG = 'KCHAT_PRODUCTS_SET_UI_FLAG';
const SET_PRODUCTS = 'KCHAT_PRODUCTS_SET';
const UPSERT_PRODUCT = 'KCHAT_PRODUCTS_UPSERT';

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
  fetch: async ({ commit }, { query, active } = {}) => {
    latestFetch += 1;
    const requestId = latestFetch;
    commit(SET_UI_FLAG, { isFetching: true });
    try {
      const { data } = await KchatProductsAPI.get({ query, active });
      if (requestId === latestFetch) commit(SET_PRODUCTS, data);
    } finally {
      if (requestId === latestFetch) commit(SET_UI_FLAG, { isFetching: false });
    }
  },

  create: ({ commit }, payload) =>
    withFlag({ commit }, 'isCreating', async () => {
      const { data } = await KchatProductsAPI.create(payload);
      commit(UPSERT_PRODUCT, data);
      return data;
    }),

  update: ({ commit }, { id, ...payload }) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { data } = await KchatProductsAPI.update(id, payload);
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
};

export default {
  namespaced: true,
  state: createState,
  getters,
  actions,
  mutations,
};
