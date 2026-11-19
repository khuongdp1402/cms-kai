/* global axios */
import ApiClient from '../ApiClient';

class KchatCommentRulesAPI extends ApiClient {
  constructor() {
    super('kchat/comment_rules', { accountScoped: true });
  }

  get() {
    return axios.get(this.url);
  }

  update(payload) {
    return axios.patch(this.url, payload);
  }
}

export default new KchatCommentRulesAPI();
