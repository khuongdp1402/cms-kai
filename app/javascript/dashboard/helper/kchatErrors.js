import { useAlert } from 'dashboard/composables';

const KNOWN_CODES = [
  'insufficient_stock',
  'invalid_transition',
  'payment_settings_missing',
  'invalid_amount',
  'order_not_payable',
  'conversation_contact_mismatch',
  'subscription_expired',
  'validation_failed',
];

const errorCode = error => error?.response?.data?.error;

// Maps a KChat API error to an i18n key under KALO_ORDERS.ERRORS.
export const kchatErrorKey = error => {
  const code = errorCode(error);
  const key = KNOWN_CODES.includes(code) ? code.toUpperCase() : 'UNKNOWN';
  return `KALO_ORDERS.ERRORS.${key}`;
};

// Toast action that leads to the fix, when there is one. The route keeps the
// current accountId param.
export const kchatErrorAction = (error, t) =>
  errorCode(error) === 'payment_settings_missing'
    ? {
        type: 'link',
        to: { name: 'kalo_payment_settings' },
        message: t('KALO_PAYMENT.SETUP_LINK'),
        duration: 6000,
      }
    : null;

export const alertKchatError = (error, t) => {
  const message = t(kchatErrorKey(error));
  const action = kchatErrorAction(error, t);
  if (action) useAlert(message, action);
  else useAlert(message);
};
