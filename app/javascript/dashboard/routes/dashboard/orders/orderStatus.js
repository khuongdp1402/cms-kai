// Presentation helpers shared by the orders table and the order drawer.
export const STATUS_TABS = [
  { key: 'ALL', status: undefined },
  { key: 'PENDING_PAYMENT', status: 'pending_payment' },
  { key: 'PAID', status: 'paid' },
  { key: 'SHIPPING', status: 'shipping' },
  { key: 'COMPLETED', status: 'completed' },
];

const OK = 'bg-[#E3F4E8] text-[#1B6B3A]';
const WARN = 'bg-[#FFF1D6] text-[#8A5300]';
const GRAY = 'bg-n-alpha-2 text-n-slate-11';
const NEW = 'bg-woot-50 text-woot-600';

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

export const deliveryChip = order => {
  if (order.status === 'cancelled') return { key: 'CANCELLED', tone: GRAY };
  if (order.status === 'shipping') return { key: 'SHIPPING', tone: NEW };
  if (order.status === 'completed') return { key: 'COMPLETED', tone: OK };
  return { key: 'NOT_SHIPPED', tone: GRAY };
};

// One primary row action per status. A QR can only be sent into a chat.
export const rowAction = order => {
  const { status, payment_method: method } = order;
  if (status === 'pending_payment') {
    if (method === 'cod') return { key: 'SHIP', event: 'ship', icon: 'truck' };
    if (order.conversation_id) return { key: 'SEND_QR', sendQr: true };
    return { key: 'MARK_PAID', event: 'mark_paid' };
  }
  if (status === 'paid') return { key: 'SHIP', event: 'ship', icon: 'truck' };
  if (status === 'shipping') return { key: 'COMPLETE', event: 'complete' };
  return null;
};
