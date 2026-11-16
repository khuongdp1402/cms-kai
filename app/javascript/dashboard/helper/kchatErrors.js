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

// Maps a KChat API error to an i18n key under KALO_ORDERS.ERRORS.
export const kchatErrorKey = error => {
  const code = error?.response?.data?.error;
  const key = KNOWN_CODES.includes(code) ? code.toUpperCase() : 'UNKNOWN';
  return `KALO_ORDERS.ERRORS.${key}`;
};
