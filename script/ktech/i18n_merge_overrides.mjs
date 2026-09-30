// Merges flat translations ({ "A.B.C": "text" }) into the nested KTech
// override file, keeping keys sorted so diffs stay reviewable.
// Usage: node script/ktech/i18n_merge_overrides.mjs <locale> <flat.json> [...]
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const [locale, ...inputs] = process.argv.slice(2);
if (!locale || !inputs.length) {
  throw new Error('usage: i18n_merge_overrides.mjs <locale> <flat.json> [...]');
}
const target = path.join(root, `app/javascript/dashboard/i18n/ktech/${locale}.json`);

const setPath = (obj, keyPath, value) => {
  const keys = keyPath.split('.');
  let node = obj;
  keys.slice(0, -1).forEach(key => {
    node[key] = node[key] && typeof node[key] === 'object' ? node[key] : {};
    node = node[key];
  });
  node[keys[keys.length - 1]] = value;
};
const sortDeep = value =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map(key => [key, sortDeep(value[key])])
      )
    : value;

const merged = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
let count = 0;
inputs.forEach(input => {
  Object.entries(JSON.parse(fs.readFileSync(input, 'utf8'))).forEach(([key, text]) => {
    setPath(merged, key, text);
    count += 1;
  });
});
fs.writeFileSync(target, `${JSON.stringify(sortDeep(merged), null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`merged ${count} strings into ${path.relative(root, target)}`);
