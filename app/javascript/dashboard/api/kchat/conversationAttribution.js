/* global axios */
import ApiClient from '../ApiClient';

class KchatConversationAttributionAPI extends ApiClient {
  constructor() {
    super('kchat/conversations', { accountScoped: true });
  }

  update(conversationDisplayId, payload) {
    return axios.patch(
      `${this.url}/${conversationDisplayId}/attribution`,
      payload
    );
  }
}

export default new KchatConversationAttributionAPI();
