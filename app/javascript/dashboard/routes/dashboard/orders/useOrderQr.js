import { ref, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { kchatErrorAction, kchatErrorKey } from 'dashboard/helper/kchatErrors';

// With responseType blob an error body arrives as a Blob; read the JSON back.
const readableError = async error => {
  const body = error?.response?.data;
  if (typeof Blob === 'undefined' || !(body instanceof Blob)) return error;
  try {
    return { response: { data: JSON.parse(await body.text()) } };
  } catch {
    return error;
  }
};

// Loads the authenticated QR PNG as an object URL and owns its lifetime.
export const useOrderQr = () => {
  const { t } = useI18n();
  const url = ref('');
  const error = ref('');
  // True when the fix is the payment settings page (no bank account yet).
  const needsSetup = ref(false);
  const isLoading = ref(false);
  let requestId = 0;
  let disposed = false;

  const release = () => {
    if (url.value) URL.revokeObjectURL(url.value);
    url.value = '';
  };

  const load = async orderId => {
    release();
    error.value = '';
    needsSetup.value = false;
    requestId += 1;
    const mine = requestId;
    isLoading.value = true;
    try {
      const { data } = await OrdersAPI.qr(orderId);
      if (disposed || mine !== requestId) return;
      url.value = URL.createObjectURL(data);
    } catch (e) {
      const normalized = await readableError(e);
      if (!disposed && mine === requestId) {
        error.value = t(kchatErrorKey(normalized));
        needsSetup.value = !!kchatErrorAction(normalized, t);
      }
    } finally {
      if (mine === requestId) isLoading.value = false;
    }
  };

  const dispose = () => {
    disposed = true;
    requestId += 1;
    release();
  };

  onBeforeUnmount(dispose);

  return { url, error, needsSetup, isLoading, load, release };
};
