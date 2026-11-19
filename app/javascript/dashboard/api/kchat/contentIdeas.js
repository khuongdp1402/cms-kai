/* global axios */
import ApiClient from '../ApiClient';

class KchatContentIdeasAPI extends ApiClient {
  constructor() {
    super('brand_growth', { accountScoped: true });
  }

  overview() {
    return axios.get(`${this.url}/overview`);
  }

  saveProfile(profile) {
    return axios.post(`${this.url}/save_profile`, profile);
  }

  repurpose(topic) {
    return axios.post(`${this.url}/repurpose`, { topic });
  }

  decide(jobId, jobAction, angleIndex) {
    return axios.post(`${this.url}/approve_job`, {
      job_id: jobId,
      job_action: jobAction,
      ...(angleIndex !== undefined ? { angle_index: angleIndex } : {}),
    });
  }

  updateAngle(jobId, angleIndex, payload) {
    return axios.patch(`${this.url}/update_angle`, {
      job_id: jobId,
      angle_index: angleIndex,
      ...payload,
    });
  }

  saveCalendarItem(item) {
    return axios.post(`${this.url}/save_calendar_item`, item);
  }

  deleteCalendarItem(id) {
    return axios.delete(`${this.url}/delete_calendar_item`, {
      params: { id },
    });
  }
}

export default new KchatContentIdeasAPI();
