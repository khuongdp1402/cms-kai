/* global axios */
import ApiClient from '../ApiClient';

class KchatPaymentSettingsAPI extends ApiClient {
  constructor() {
    super('kchat/payment_settings', { accountScoped: true });
  }

  // Singular resource: no id in the URL.
  save(settings) {
    return axios.patch(this.url, settings);
  }

  // PNG of a sample VietQR for unsaved values. Needs the auth headers,
  // so an <img src> cannot call it.
  previewQr({ bankBin, accountNumber }) {
    return axios.get(`${this.url}/preview_qr`, {
      params: { bank_bin: bankBin, account_number: accountNumber },
      responseType: 'blob',
    });
  }
}

export default new KchatPaymentSettingsAPI();
