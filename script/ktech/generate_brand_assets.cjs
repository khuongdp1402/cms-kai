// Regenerates KTech logos and icons. Dependencies are installed in tmp/ so the
// project gets no new packages:
//   npm i --no-save --prefix tmp/ktech-brand opentype.js@1 sharp@0.33 @fontsource/inter@5
//   node script/ktech/generate_brand_assets.cjs
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'tmp/ktech-brand/node_modules/'));
const opentype = req('opentype.js');
const sharp = req('sharp');

const font = opentype.loadSync(
  req.resolve('@fontsource/inter/files/inter-latin-700-normal.woff')
);
const pub = p => path.join(root, 'public', p);

const MARK = `
  <defs><linearGradient id="kt-mark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FDBA74"/><stop offset=".5" stop-color="#EA580C"/><stop offset="1" stop-color="#7C2D12"/>
  </linearGradient></defs>
  <rect x="2" y="2" width="44" height="40" rx="12" fill="url(#kt-mark)"/>
  <path d="M10 41 L6 47 L19 41Z" fill="#9A3412"/>
  <path d="M17 12v20M17 22l12-10M20 20l10 12" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

const FONT_SIZE = 30;
const word = (text, x, fill) =>
  `<path d="${font.getPath(text, x, 35, FONT_SIZE).toPathData(2)}" fill="${fill}"/>`;

const kWidth = font.getAdvanceWidth('K', FONT_SIZE);
const width = Math.ceil(58 + font.getAdvanceWidth('KTech', FONT_SIZE) + 4);

const logo = ({ k, from, to }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48" viewBox="0 0 ${width} 48">
  ${MARK}
  <defs><linearGradient id="kt-word" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  ${word('K', 58, k)}
  ${word('Tech', 58 + kWidth, 'url(#kt-word)')}
</svg>
`;

fs.writeFileSync(
  pub('brand-assets/logo.svg'),
  logo({ k: '#431407', from: '#EA580C', to: '#7C2D12' })
);
fs.writeFileSync(
  pub('brand-assets/logo_dark.svg'),
  logo({ k: '#FFF7ED', from: '#FDBA74', to: '#FB923C' })
);
const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${MARK}</svg>\n`;
fs.writeFileSync(pub('brand-assets/logo_thumbnail.svg'), thumb);

const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${MARK}
  <circle cx="39" cy="9" r="8" fill="#DC2626" stroke="#fff" stroke-width="2.5"/></svg>`;

const icons = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-96x96.png': 96,
  'favicon-512x512.png': 512,
  'apple-icon.png': 192,
  'apple-icon-precomposed.png': 192,
  'apple-touch-icon.png': 180,
  'apple-touch-icon-precomposed.png': 180,
  'apple-icon-57x57.png': 57,
  'apple-icon-60x60.png': 60,
  'apple-icon-72x72.png': 72,
  'apple-icon-76x76.png': 76,
  'apple-icon-114x114.png': 114,
  'apple-icon-120x120.png': 120,
  'apple-icon-144x144.png': 144,
  'apple-icon-152x152.png': 152,
  'apple-icon-180x180.png': 180,
  'android-icon-36x36.png': 36,
  'android-icon-48x48.png': 48,
  'android-icon-72x72.png': 72,
  'android-icon-96x96.png': 96,
  'android-icon-144x144.png': 144,
  'android-icon-192x192.png': 192,
  'ms-icon-70x70.png': 70,
  'ms-icon-144x144.png': 144,
  'ms-icon-150x150.png': 150,
  'ms-icon-310x310.png': 310,
};
const badges = {
  'favicon-badge-16x16.png': 16,
  'favicon-badge-32x32.png': 32,
  'favicon-badge-96x96.png': 96,
};

const render = (svg, size, name) =>
  sharp(Buffer.from(svg), { density: Math.ceil(72 * (size / 48) * 2) })
    .resize(size, size)
    .png()
    .toFile(pub(name));

(async () => {
  for (const [name, size] of Object.entries(icons)) await render(thumb, size, name);
  for (const [name, size] of Object.entries(badges)) await render(badge, size, name);
  // eslint-disable-next-line no-console
  console.log(
    `logos + ${Object.keys(icons).length + Object.keys(badges).length} icons written`
  );
})();
