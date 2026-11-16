/* global axios */
import ApiClient from '../ApiClient';

class KchatReportsAPI extends ApiClient {
  constructor() {
    super('kchat/reports', { accountScoped: true });
  }

  summary(range) {
    return axios.get(`${this.url}/summary`, { params: { range } });
  }
}

export default new KchatReportsAPI();
