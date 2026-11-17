import paymentSettingsAPI from '../paymentSettings';
import ApiClient from '../../ApiClient';

describe('#KchatPaymentSettingsAPI', () => {
  const originalAxios = window.axios;
  const axiosMock = {
    get: vi.fn(() => Promise.resolve()),
    patch: vi.fn(() => Promise.resolve()),
  };
  const base = /\/api\/v1(\/accounts\/\d+)?\/kchat\/payment_settings/;

  beforeEach(() => {
    window.axios = axiosMock;
  });
  afterEach(() => {
    window.axios = originalAxios;
    vi.clearAllMocks();
  });

  it('creates correct instance', () => {
    expect(paymentSettingsAPI).toBeInstanceOf(ApiClient);
  });

  it('reads the settings', () => {
    paymentSettingsAPI.get();
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`${base.source}$`))
    );
  });

  it('saves the settings with a PATCH on the singular resource', () => {
    const settings = {
      bank_bin: '970436',
      bank_name: 'Vietcombank',
      account_number: '0123456789',
      account_name: 'NGUYEN VAN A',
    };
    paymentSettingsAPI.save(settings);
    expect(axiosMock.patch).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`${base.source}$`)),
      settings
    );
  });

  it('fetches the preview QR as a blob for unsaved values', () => {
    paymentSettingsAPI.previewQr({
      bankBin: '970436',
      accountNumber: '0123456789',
    });
    expect(axiosMock.get).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`${base.source}/preview_qr$`)),
      {
        params: { bank_bin: '970436', account_number: '0123456789' },
        responseType: 'blob',
      }
    );
  });
});
