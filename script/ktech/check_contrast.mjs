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
const SIDEBAR_TOP = [58, 26, 18]; // #3A1A12 Kalo sidebar top
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

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
  ['light slate-12 / bot bubble', light['slate-12'], light['solid-iris']],
  ['dark slate-12 / bot bubble', dark['slate-12'], dark['solid-iris']],
  ['sidebar slate-11 / button', sidebar['slate-11'], sidebar['button-color']],
  ['sidebar slate-11 / top #3A1A12', sidebar['slate-11'], SIDEBAR_TOP],
  ['sidebar slate-12 / top #3A1A12', sidebar['slate-12'], SIDEBAR_TOP],
  ['kalo white / action #C93F24', WHITE, hex('#C93F24')],
  ['kalo action #C93F24 / #FFF6F2', hex('#C93F24'), hex('#FFF6F2')],
  ['kalo ink #1F1714 / #FFF8F5', hex('#1F1714'), hex('#FFF8F5')],
  ['kalo muted #6E625B / white', hex('#6E625B'), WHITE],
  ['kalo ok #0E7C61 / white', hex('#0E7C61'), WHITE],
  ['kalo warn #B45309 / white', hex('#B45309'), WHITE],
];
// Console palette (tailwind.config.js colors.console)
[
  ['console ink #1F1A33 / bg #F7F6FB', '#1F1A33', '#F7F6FB'],
  ['console ink #1F1A33 / white', '#1F1A33', '#FFFFFF'],
  [
    'console muted #6B6485 / white (placeholder, input border)',
    '#6B6485',
    '#FFFFFF',
  ],
  ['console muted #6B6485 / bg #F7F6FB', '#6B6485', '#F7F6FB'],
  ['console text #D9D4EE / sidebar #231C40', '#D9D4EE', '#231C40'],
  ['console white / accent #3B2F6B', '#FFFFFF', '#3B2F6B'],
  ['console accent #3B2F6B / white', '#3B2F6B', '#FFFFFF'],
].forEach(([name, fg, bg]) => pairs.push([name, hex(fg), hex(bg)]));
const AVATAR_PAIRS = [
  ['#7F2A16', '#FFE9E1'],
  ['#0E4F63', '#A5F3FC'],
  ['#3A2F29', '#E6D6CD'],
  ['#064E3B', '#A7F3D0'],
  ['#5C3A0B', '#FDE68A'],
  ['#4C0519', '#FBCFE8'],
  ['#FFE9E1', '#A3361D'],
  ['#CFFAFE', '#0E7490'],
  ['#F0E4DD', '#4A3F39'],
  ['#D1FAE5', '#065F46'],
  ['#FDF0DC', '#8A4204'],
  ['#FCE7F3', '#9D174D'],
  ['#FFF1EC', '#A3361D'],
];
AVATAR_PAIRS.forEach(([bg, text]) =>
  pairs.push([`avatar ${text} / ${bg}`, hex(text), hex(bg)])
);
let failed = false;
pairs.forEach(([name, fg, bg]) => {
  const r = ratio(fg, bg);
  failed ||= r < 4.5;
  // eslint-disable-next-line no-console
  console.log(`${r < 4.5 ? 'FAIL' : 'ok  '} ${r.toFixed(2)}  ${name}`);
});
process.exit(failed ? 1 : 0);
