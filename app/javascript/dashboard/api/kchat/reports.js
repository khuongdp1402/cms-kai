/* global axios */
import ApiClient from '../ApiClient';

class KchatReportsAPI extends ApiClient {
  constructor() {
    super('kchat/reports', { accountScoped: true });
  }

  summary(range) {
    return axios.get(`${this.url}/summary`, { params: { range } });
  }

  funnel(range) {
    return axios.get(`${this.url}/funnel`, { params: { range } });
  }

  brandsOverview(range) {
    return axios.get(`${this.url}/brands_overview`, { params: { range } });
  }

  qualityOverview(range) {
    return axios.get(`${this.url}/quality_overview`, { params: { range } });
  }
}

export default new KchatReportsAPI();
