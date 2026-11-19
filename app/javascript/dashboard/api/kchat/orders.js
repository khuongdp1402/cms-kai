/* global axios */
import ApiClient from '../ApiClient';

class KchatOrdersAPI extends ApiClient {
  constructor() {
    super('kchat/orders', { accountScoped: true });
  }

  get({ status, query, page, contactId, delivery } = {}) {
    const params = { status, query, page, contact_id: contactId };
    // delivery=pending: paid orders that still ship (no POS sales).
    if (delivery) params.delivery = delivery;
    return axios.get(this.url, { params });
  }

  transition(id, event) {
    return axios.post(`${this.url}/${id}/transition`, { event });
  }

  sendQr(id, conversationId) {
    return axios.post(`${this.url}/${id}/send_qr`, {
      conversation_id: conversationId,
    });
  }

  // The QR endpoint needs the auth headers, so an <img src> cannot call it.
  qr(id) {
    return axios.get(`${this.url}/${id}/qr`, { responseType: 'blob' });
  }
}

export default new KchatOrdersAPI();
