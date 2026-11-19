/* global axios */
import ApiClient from '../ApiClient';

class ConsoleAPI extends ApiClient {
  constructor() {
    super('console', { apiVersion: 'v1' });
  }

  overview() {
    return axios.get(`${this.url}/overview`);
  }

  accounts({ query, filter, page } = {}) {
    return axios.get(`${this.url}/accounts`, {
      params: { query, filter, page },
    });
  }

  updateAccount(id, data) {
    return axios.patch(`${this.url}/accounts/${id}`, data);
  }

  paymentEvents({ status, page } = {}) {
    return axios.get(`${this.url}/payment_events`, {
      params: { status, page },
    });
  }

  assignPaymentEvent(id, accountId) {
    return axios.post(`${this.url}/payment_events/${id}/assign`, {
      account_id: accountId,
    });
  }

  emails({ query } = {}) {
    return axios.get(`${this.url}/mail_inspector`, {
      params: { query },
    });
  }

  deleteEmail(id) {
    return axios.delete(`${this.url}/mail_inspector/${encodeURIComponent(id)}`);
  }

  clearEmails() {
    return axios.delete(`${this.url}/mail_inspector/clear`);
  }
}

export default new ConsoleAPI();
