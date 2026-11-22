/* global axios */
import ApiClient from '../ApiClient';

class KchatProductsAPI extends ApiClient {
  constructor() {
    super('kchat/products', { accountScoped: true });
  }

  get({ query, active, category, availabilityMode } = {}) {
    return axios.get(this.url, {
      params: {
        query,
        active,
        category,
        availability_mode: availabilityMode,
      },
    });
  }

  importProducts(payload) {
    return axios.post(`${this.url}/import`, payload);
  }

  // Relative stock change (restock, count), done atomically by the backend.
  adjustStock(id, delta) {
    return axios.post(`${this.url}/${id}/adjust_stock`, { delta });
  }
}

export default new KchatProductsAPI();
