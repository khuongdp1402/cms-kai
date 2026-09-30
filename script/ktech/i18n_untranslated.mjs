// Lists dashboard strings that are missing in a locale or still identical to
// English, taking the KTech overrides into account.
// Usage: node script/ktech/i18n_untranslated.mjs [locale=vi] [file.json ...] [--json]
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const localeDir = path.join(root, 'app/javascript/dashboard/i18n/locale');
const overridePath = locale =>
  path.join(root, `app/javascript/dashboard/i18n/ktech/${locale}.json`);

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const positional = args.filter(arg => arg !== '--json');
const locale = positional[0] && !positional[0].endsWith('.json') ? positional.shift() : 'vi';
const files = positional.length
  ? positional
  : fs.readdirSync(path.join(localeDir, 'en')).filter(f => f.endsWith('.json'));

const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out);
    else out[full] = value;
  });
  return out;
};
const read = file => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

const overrides = flatten(read(overridePath(locale)));
const result = {};
files.forEach(file => {
  const en = flatten(read(path.join(localeDir, 'en', file)));
  const translated = flatten(read(path.join(localeDir, locale, file)));
  Object.entries(en).forEach(([key, text]) => {
    if (typeof text !== 'string' || !/[a-z]{2}/i.test(text)) return;
    if (key in overrides) return;
    if (!(key in translated) || translated[key] === text) result[key] = text;
  });
});

if (asJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  // eslint-disable-next-line no-console
  console.log(`${Object.keys(result).length} untranslated ${locale} strings in ${files.length} file(s)`);
}
