// Usage: node script/ktech/check_contrast.mjs  — exits 1 if any pair < 4.5:1
import fs from 'node:fs';

const scss = fs.readFileSync(
  new URL(
    '../../app/javascript/dashboard/assets/scss/_ktech-theme.scss',
    import.meta.url
  ),
  'utf8'
);
const block = selector => {
  const start = scss.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = scss.slice(start, scss.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)].map(m => [
      m[1],
      [+m[2], +m[3], +m[4]],
    ])
  );
};
const lum = c => {
  const v = c
    .map(x => x / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const WHITE = [255, 255, 255];
const SIDEBAR_TOP = [176, 58, 14];

const light = block(':root');
const dark = block('.dark');
const sidebar = block('.ktech-sidebar');
const pairs = [
  ['light white / blue-9', WHITE, light['blue-9']],
  ['light blue-11 / background', light['blue-11'], light['background-color']],
  ['light slate-11 / background', light['slate-11'], light['background-color']],
  ['light slate-12 / surface-1', light['slate-12'], light['surface-1']],
  ['dark white / blue-9', WHITE, dark['blue-9']],
  ['dark blue-11 / background', dark['blue-11'], dark['background-color']],
  ['dark slate-11 / background', dark['slate-11'], dark['background-color']],
  ['dark slate-12 / surface-1', dark['slate-12'], dark['surface-1']],
  ['sidebar slate-11 / top #B03A0E', sidebar['slate-11'], SIDEBAR_TOP],
  ['sidebar slate-12 / top #B03A0E', sidebar['slate-12'], SIDEBAR_TOP],
];
let failed = false;
pairs.forEach(([name, fg, bg]) => {
  const r = ratio(fg, bg);
  failed ||= r < 4.5;
  // eslint-disable-next-line no-console
  console.log(`${r < 4.5 ? 'FAIL' : 'ok  '} ${r.toFixed(2)}  ${name}`);
});
process.exit(failed ? 1 : 0);
