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

  // Broadcast record plus counted results (kchat/broadcasts/:id).
  results(id) {
    return axios.get(`${this.url}/${id}`);
  }

  updateDraft(id, payload) {
    return axios.patch(`${this.url}/${id}`, payload);
  }

  destroyDraft(id) {
    return axios.delete(`${this.url}/${id}`);
  }

  audience(params) {
    return axios.get(`${this.url}/audience`, { params });
  }

  checkContent(message) {
    return axios.post(`${this.url}/check_content`, { message });
  }
}

export default new KchatBroadcastsAPI();
