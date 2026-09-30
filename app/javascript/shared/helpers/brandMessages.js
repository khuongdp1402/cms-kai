const PRODUCT_NAME = /chatwoot/gi;
// Captured so String#split keeps them at odd indexes: placeholders, linked keys, URLs.
const PROTECTED = /(\{[^}]*\}|@(?:\.\w+)?:[\w.]+|https?:\/\/\S+)/;

const brandString = (text, brandName) =>
  text
    .split(PROTECTED)
    .map((part, index) =>
      index % 2 ? part : part.replace(PRODUCT_NAME, brandName)
    )
    .join('');

const walk = (value, brandName) => {
  if (typeof value === 'string') return brandString(value, brandName);
  if (Array.isArray(value)) return value.map(item => walk(item, brandName));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, walk(item, brandName)])
    );
  }
  return value;
};

export const brandMessages = (messages, brandName) =>
  brandName ? walk(messages, brandName) : messages;

export const installationBrandName = () =>
  window.globalConfig?.INSTALLATION_NAME;
