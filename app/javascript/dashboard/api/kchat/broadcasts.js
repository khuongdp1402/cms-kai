/* global axios */
import ApiClient from '../ApiClient';

class KchatBroadcastsAPI extends ApiClient {
  constructor() {
    super('kchat/broadcasts', { accountScoped: true });
  }

  list() {
    return axios.get(this.url);
  }

  preview(params) {
    return axios.get(`${this.url}/preview`, { params });
  }

  create(payload) {
    return axios.post(this.url, payload);
  }
}

export default new KchatBroadcastsAPI();
