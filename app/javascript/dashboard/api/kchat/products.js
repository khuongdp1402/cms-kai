/* global axios */
import ApiClient from '../ApiClient';

class KchatProductsAPI extends ApiClient {
  constructor() {
    super('kchat/products', { accountScoped: true });
  }

  get({ query, active } = {}) {
    return axios.get(this.url, { params: { query, active } });
  }
}

export default new KchatProductsAPI();
