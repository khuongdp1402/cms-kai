/* global axios */

import ApiClient from './ApiClient';

class CannedResponse extends ApiClient {
  constructor() {
    super('canned_responses', { accountScoped: true });
  }

  get({ searchKey, tag } = {}) {
    const params = {};
    if (searchKey) params.search = searchKey;
    if (tag) params.tag = tag;
    return axios.get(this.url, { params });
  }
}

export default new CannedResponse();
