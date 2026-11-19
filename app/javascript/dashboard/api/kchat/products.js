/* global axios */
import ApiClient from '../ApiClient';

class KchatProductsAPI extends ApiClient {
  constructor() {
    super('kchat/products', { accountScoped: true });
  }

  get({ query, active } = {}) {
    return axios.get(this.url, { params: { query, active } });
  }

  // Relative stock change (restock, count), done atomically by the backend.
  adjustStock(id, delta) {
    return axios.post(`${this.url}/${id}/adjust_stock`, { delta });
  }
}

export default new KchatProductsAPI();
