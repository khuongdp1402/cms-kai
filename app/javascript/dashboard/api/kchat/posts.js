/* global axios */
import ApiClient from '../ApiClient';

// Facebook Page posts: draft, review, approve, Kalo publishes on schedule (ADR-031/032).
class KchatPostsAPI extends ApiClient {
  constructor() {
    super('kchat/posts', { accountScoped: true });
  }

  list({ from, to, status, inboxId } = {}) {
    return axios.get(this.url, {
      params: { from, to, status, inbox_id: inboxId },
    });
  }

  // `data` is a FormData (media files) built by buildPostFormData.
  create(data) {
    return axios.post(this.url, data);
  }

  update(id, data) {
    return axios.patch(`${this.url}/${id}`, data);
  }

  destroy(id) {
    return axios.delete(`${this.url}/${id}`);
  }

  submit(id) {
    return axios.post(`${this.url}/${id}/submit`);
  }

  approve(id) {
    return axios.post(`${this.url}/${id}/approve`);
  }

  reject(id, note) {
    return axios.post(`${this.url}/${id}/reject`, { note });
  }

  unapprove(id) {
    return axios.post(`${this.url}/${id}/unapprove`);
  }

  retryPublish(id) {
    return axios.post(`${this.url}/${id}/retry_publish`);
  }

  requestMedia(id, note) {
    return axios.post(`${this.url}/${id}/request_media`, { note });
  }
}

export default new KchatPostsAPI();
