/* global axios */
import ApiClient from '../ApiClient';

class KchatBrandGrowthAPI extends ApiClient {
  constructor() {
    super('brand_growth', { accountScoped: true });
  }

  chatReply({ message, history }) {
    return axios.post(`${this.url}/chat_reply`, { message, history });
  }
}

export default new KchatBrandGrowthAPI();
