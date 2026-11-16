export const makeOrder = (overrides = {}) => ({
  id: 1,
  number: 1042,
  status: 'pending_payment',
  source: 'chat',
  payment_method: 'transfer_qr',
  contact: { id: 7, name: 'Thu Hà', phone: null },
  conversation_id: 12,
  items: [
    {
      id: 1,
      product_id: 1,
      name: 'Nến gỗ đàn hương',
      unit_price: 189000,
      quantity: 2,
    },
  ],
  subtotal: 378000,
  shipping_fee: 25000,
  total: 403000,
  shipping_address: null,
  shipping_carrier: null,
  tracking_code: null,
  paid_at: null,
  created_at: '2026-11-16T07:05:00Z',
  ...overrides,
});

export const makeProduct = (overrides = {}) => ({
  id: 1,
  name: 'Nến gỗ đàn hương',
  sku: null,
  price: 189000,
  stock: 10,
  active: true,
  image_url: null,
  ...overrides,
});
