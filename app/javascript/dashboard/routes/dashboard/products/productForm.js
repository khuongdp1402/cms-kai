// Mirrors Kchat::Product::IMAGE_CONTENT_TYPES / IMAGE_MAX_SIZE.
export const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AVAILABILITY_MODES = ['in_stock', 'preorder', 'custom'];

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
  availability_mode: 'in_stock',
  category: '',
  description: '',
  pitch_template: '',
  external_id: '',
  image_remote_url: '',
  image: null,
});

export const formFromProduct = product => ({
  name: product.name || '',
  sku: product.sku || '',
  price: product.price == null ? '' : String(product.price),
  stock: product.stock == null ? '' : String(product.stock),
  availability_mode: product.availability_mode || 'in_stock',
  category: product.category || '',
  description: product.description || '',
  pitch_template: product.pitch_template || '',
  external_id: product.external_id || '',
  image_remote_url: product.image_remote_url || '',
  image: null,
});

const isValidHttpUrl = value => {
  const text = String(value ?? '').trim();
  if (!text) return true;
  return /^https?:\/\/\S+$/i.test(text);
};

// Error keys under KALO_PRODUCTS.FORM.ERRORS, by field.
export const validateForm = form => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'NAME_REQUIRED';
  if (parseVnd(form.price) === null) errors.price = 'PRICE_INVALID';
  if (
    (form.availability_mode || 'in_stock') === 'in_stock' &&
    Number.isNaN(wholeOrBlank(form.stock).value)
  ) {
    errors.stock = 'STOCK_INVALID';
  }
  if (!isValidHttpUrl(form.image_remote_url)) {
    errors.image_remote_url = 'IMAGE_URL_INVALID';
  }
  if (form.image) {
    if (!IMAGE_TYPES.includes(form.image.type)) errors.image = 'IMAGE_TYPE';
    else if (form.image.size > IMAGE_MAX_BYTES) errors.image = 'IMAGE_SIZE';
  }
  return errors;
};

// JSON body, or FormData when an image is attached. Optional sales-catalog fields
// are omitted when unchanged/default so basic payloads remain concise.
export const buildPayload = (form, existing = null) => {
  const mode = form.availability_mode || 'in_stock';
  const fields = {
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    price: parseVnd(form.price),
    stock: mode === 'in_stock' ? wholeOrBlank(form.stock).value : null,
  };
  if (mode !== 'in_stock' || existing?.availability_mode) {
    if (mode !== 'in_stock' || existing?.availability_mode !== mode) {
      fields.availability_mode = mode;
    }
  }
  [
    'category',
    'description',
    'pitch_template',
    'external_id',
    'image_remote_url',
  ].forEach(key => {
    const val = String(form[key] ?? '').trim();
    if (val || existing?.[key]) fields[key] = val || null;
  });

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
