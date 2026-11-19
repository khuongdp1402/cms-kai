// Mirrors Kchat::Product::IMAGE_CONTENT_TYPES / IMAGE_MAX_SIZE.
export const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// "150.000", "150 000", "150,000" → 150000; anything else (letters, decimals,
// negatives) → null. Shops type prices the way they print them.
export const parseVnd = value => {
  const digits = String(value ?? '')
    .trim()
    .replace(/[.,\s]/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

const wholeOrBlank = value => {
  const text = String(value ?? '').trim();
  if (!text) return { blank: true, value: null };
  return /^\d+$/.test(text)
    ? { blank: false, value: Number(text) }
    : { blank: false, value: NaN };
};

export const emptyForm = () => ({
  name: '',
  sku: '',
  price: '',
  stock: '',
  image: null,
});

export const formFromProduct = product => ({
  name: product.name || '',
  sku: product.sku || '',
  price: product.price == null ? '' : String(product.price),
  stock: product.stock == null ? '' : String(product.stock),
  image: null,
});

// Error keys under KALO_PRODUCTS.FORM.ERRORS, by field.
export const validateForm = form => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'NAME_REQUIRED';
  if (parseVnd(form.price) === null) errors.price = 'PRICE_INVALID';
  if (Number.isNaN(wholeOrBlank(form.stock).value)) {
    errors.stock = 'STOCK_INVALID';
  }
  if (form.image) {
    if (!IMAGE_TYPES.includes(form.image.type)) errors.image = 'IMAGE_TYPE';
    else if (form.image.size > IMAGE_MAX_BYTES) errors.image = 'IMAGE_SIZE';
  }
  return errors;
};

// JSON body, or FormData when an image is attached. A blank stock is sent as
// null (JSON) / "" (FormData): the shop stops tracking stock for the product.
export const buildPayload = form => {
  const fields = {
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    price: parseVnd(form.price),
    stock: wholeOrBlank(form.stock).value,
  };
  if (!form.image) return fields;
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) =>
    data.append(key, value === null ? '' : String(value))
  );
  data.append('image', form.image);
  return data;
};

// Larger stock moves are typos; the backend column is a 4-byte integer.
export const MAX_DELTA = 1e9;

// Parses "+3", "-2", "5"; 0, non integers and |delta| > MAX_DELTA → null.
export const parseDelta = value => {
  const text = String(value ?? '')
    .trim()
    .replace(/^\+/, '');
  if (!/^-?\d+$/.test(text)) return null;
  const delta = Number(text);
  return delta === 0 || Math.abs(delta) > MAX_DELTA ? null : delta;
};
