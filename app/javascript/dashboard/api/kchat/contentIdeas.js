/* global axios */
import ApiClient from '../ApiClient';

class KchatContentIdeasAPI extends ApiClient {
  constructor() {
    super('brand_growth', { accountScoped: true });
  }

  repurpose(topic) {
    return axios.post(`${this.url}/repurpose`, { topic });
  }

  decide(jobId, jobAction) {
    return axios.post(`${this.url}/approve_job`, {
      job_id: jobId,
      job_action: jobAction,
    });
  }
}

export default new KchatContentIdeasAPI();
