import en from '../../locale/en';
import overrides from '../index';

const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  });
  return out;
};

const tokens = text =>
  (text.match(/\{[^}]*\}|@(?:\.\w+)?:[\w.]+/g) || []).sort();

const english = flatten(en);

describe.each(Object.keys(overrides))('KTech %s overrides', locale => {
  const entries = Object.entries(flatten(overrides[locale]));

  it.each(entries)('%s is a known English key', key => {
    expect(english).toHaveProperty([key]);
  });

  it.each(entries)('%s is a non-empty string', (_key, text) => {
    expect(typeof text).toBe('string');
    expect(text.trim()).not.toBe('');
  });

  it.each(entries)('%s keeps the English placeholders', (key, text) => {
    expect(tokens(text)).toEqual(tokens(english[key]));
  });
});
