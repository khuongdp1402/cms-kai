import KchatOrdersAPI from '../../../api/kchat/orders';

const SET_UI_FLAG = 'KCHAT_ORDERS_SET_UI_FLAG';
const SET_ORDERS = 'KCHAT_ORDERS_SET';
const ADD_ORDER = 'KCHAT_ORDERS_ADD';
const UPSERT_ORDER = 'KCHAT_ORDERS_UPSERT';

export const createState = () => ({
  records: [],
  meta: {},
  uiFlags: { isFetching: false, isCreating: false, isUpdating: false },
});

export const getters = {
  getOrders: $state => $state.records,
  getOrderById: $state => id =>
    $state.records.find(record => record.id === Number(id)),
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

export const actions = {
  fetch: ({ commit }, { status, query, page } = {}) =>
    withFlag({ commit }, 'isFetching', async () => {
      const { data } = await KchatOrdersAPI.get({ status, query, page });
      commit(SET_ORDERS, data);
    }),

  create: ({ commit }, payload) =>
    withFlag({ commit }, 'isCreating', async () => {
      const { data } = await KchatOrdersAPI.create(payload);
      commit(ADD_ORDER, data);
      return data;
    }),

  transition: ({ commit }, { id, event }) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { data } = await KchatOrdersAPI.transition(id, event);
      commit(UPSERT_ORDER, data);
      return data;
    }),

  sendQr: ({ commit }, { id, conversationId }) =>
    withFlag({ commit }, 'isUpdating', async () => {
      const { data } = await KchatOrdersAPI.sendQr(id, conversationId);
      return data;
    }),
};

export const mutations = {
  [SET_UI_FLAG]($state, flags) {
    $state.uiFlags = { ...$state.uiFlags, ...flags };
  },
  [SET_ORDERS]($state, { payload, meta }) {
    $state.records = payload;
    $state.meta = meta;
  },
  [ADD_ORDER]($state, order) {
    $state.records = [order, ...$state.records];
  },
  [UPSERT_ORDER]($state, order) {
    $state.records = $state.records.map(record =>
      record.id === order.id ? order : record
    );
  },
};

export default {
  namespaced: true,
  state: createState,
  getters,
  actions,
  mutations,
};
