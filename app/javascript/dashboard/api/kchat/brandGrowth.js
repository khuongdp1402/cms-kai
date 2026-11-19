/* global axios */
import ApiClient from '../ApiClient';

class KchatBrandGrowthAPI extends ApiClient {
  constructor() {
    super('brand_growth', { accountScoped: true });
  }

  aiHealth() {
    return axios.get(`${this.url}/ai_health`);
  }

  chatReply({ message, history }) {
    return axios.post(`${this.url}/chat_reply`, { message, history });
  }
}

export default new KchatBrandGrowthAPI();
