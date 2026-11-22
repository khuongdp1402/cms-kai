/* global axios */
import ApiClient from '../ApiClient';

class KchatBotConfigAPI extends ApiClient {
  constructor() {
    super('kchat/bot_config', { accountScoped: true });
  }

  getConfig() {
    return axios.get(this.url);
  }

  updateConfig(payload) {
    return axios.patch(this.url, payload);
  }
}

export default new KchatBotConfigAPI();
