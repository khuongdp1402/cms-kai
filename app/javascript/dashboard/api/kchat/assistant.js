/* global axios */
import ApiClient from '../ApiClient';

class KchatAssistantAPI extends ApiClient {
  constructor() {
    super('kchat/assistant', { accountScoped: true });
  }

  // mode: 'help' | 'write' | 'insights'; history: [{ role, content }]
  send({ message, mode, history }) {
    return axios.post(this.url, { message, mode, history });
  }
}

export default new KchatAssistantAPI();
