import ApiClient from '../ApiClient';

class KchatSubscriptionAPI extends ApiClient {
  constructor() {
    super('kchat/subscription', { accountScoped: true });
  }
}

export default new KchatSubscriptionAPI();
