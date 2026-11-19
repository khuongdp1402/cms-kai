// Presentation helpers shared by the orders table and the order drawer.
export const STATUS_TABS = [
  { key: 'ALL', status: undefined },
  { key: 'PENDING_PAYMENT', status: 'pending_payment' },
  // "Cần giao": paid orders that still ship; POS sales are handed over.
  { key: 'PAID', status: 'paid', delivery: 'pending' },
  { key: 'SHIPPING', status: 'shipping' },
  { key: 'COMPLETED', status: 'completed' },
];

const OK = 'bg-[#E3F4E8] text-[#1B6B3A] dark:bg-n-teal-3 dark:text-n-teal-11';
const WARN =
  'bg-[#FFF1D6] text-[#8A5300] dark:bg-n-amber-3 dark:text-n-amber-11';
const GRAY = 'bg-n-alpha-2 text-n-slate-11';
const NEW = 'bg-woot-50 text-woot-600 dark:bg-n-blue-3 dark:text-n-blue-11';

export const paymentChip = order => {
  const { status, payment_method: method } = order;
  if (status === 'cancelled') return { key: 'CANCELLED', tone: GRAY };
  if (status === 'pending_payment') {
    return method === 'cod'
      ? { key: 'COD', tone: WARN }
      : { key: 'PENDING_PAYMENT', tone: WARN };
  }
  if (method === 'cash') return { key: 'CASH', tone: OK };
  if (method === 'card') return { key: 'CARD', tone: OK };
  return { key: 'PAID', tone: OK };
};

const isCounterSale = order =>
  order.delivery_status
    ? order.delivery_status === 'not_applicable'
    : order.source === 'pos' && order.status !== 'cancelled';

const chip = (key, tone) => ({
  key,
  tone,
  labelKey: `KALO_ORDERS.DELIVERY_CHIP.${key}`,
});

export const deliveryChip = order => {
  if (order.status === 'cancelled') return chip('CANCELLED', GRAY);
  if (isCounterSale(order)) {
    return {
      key: 'AT_COUNTER',
      tone: OK,
      labelKey: 'KALO_METRICS.DELIVERY_AT_COUNTER',
    };
  }
  if (order.status === 'shipping') return chip('SHIPPING', NEW);
  if (order.status === 'completed') return chip('COMPLETED', OK);
  return chip('NOT_SHIPPED', GRAY);
};

// Counted in "Cần giao / Đang giao": paid or shipping orders that ship.
export const awaitsDelivery = order =>
  ['paid', 'shipping'].includes(order.status) && !isCounterSale(order);

// One primary row action per status. A QR can only be sent into a chat.
export const rowAction = order => {
  const { status, payment_method: method } = order;
  if (status === 'pending_payment') {
    if (method === 'cod') return { key: 'SHIP', event: 'ship', icon: 'truck' };
    if (order.conversation_id) return { key: 'SEND_QR', sendQr: true };
    return { key: 'MARK_PAID', event: 'mark_paid' };
  }
  if (status === 'paid') {
    return order.source === 'pos'
      ? { key: 'COMPLETE', event: 'complete' }
      : { key: 'SHIP', event: 'ship', icon: 'truck' };
  }
  if (status === 'shipping') return { key: 'COMPLETE', event: 'complete' };
  return null;
};
