// Regenerates Kalo logos and icons from docs/design/kalo/brand/kalo-mark.svg. Dependencies are installed in
// tmp/ so the project gets no new packages:
//   npm i --no-save --prefix tmp/ktech-brand opentype.js@1 sharp@0.33 @fontsource/be-vietnam-pro@5
//   node script/ktech/generate_brand_assets.cjs
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'tmp/ktech-brand/node_modules/'));
const opentype = req('opentype.js');
const sharp = req('sharp');

const font = opentype.loadSync(
  req.resolve('@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-800-normal.woff')
);
const pub = p => path.join(root, 'public', p);

// Inner shapes of the approved mark (viewBox 0 0 64 64); the bubble colour is injected.
const markSvg = fs.readFileSync(
  path.join(root, 'docs/design/kalo/brand/kalo-mark.svg'),
  'utf8'
);
const inner = markSvg.slice(markSvg.indexOf('>') + 1, markSvg.lastIndexOf('</svg>'));
const mark = bubble => inner.replace('fill="#FF6B4A"', `fill="${bubble}"`);

// Wordmark "kalo" as outlines (an <img> logo cannot load fonts): 40px, weight 800, letter-spacing -1.
const WORD_X = 74;
const FONT_SIZE = 40;
const SPACING = -1;
const wordmark = fill => {
  let x = WORD_X;
  let d = '';
  font.forEachGlyph('kalo', 0, 0, FONT_SIZE, {}, (glyph, gx, gy, size) => {
    d += glyph.getPath(x, 46, size).toPathData(2);
    x += (glyph.advanceWidth * size) / font.unitsPerEm + SPACING;
  });
  return `<path d="${d}" fill="${fill}"/>`;
};

const logo = ink => `<svg xmlns="http://www.w3.org/2000/svg" width="208" height="64" viewBox="0 0 208 64">${mark('#FF6B4A')}
  ${wordmark(ink)}
</svg>
`;
const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${mark('#FF6B4A')}</svg>\n`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${mark('#FF6B4A')}
  <circle cx="52" cy="12" r="10" fill="#C93F24" stroke="#fff" stroke-width="3"/></svg>`;

fs.writeFileSync(pub('brand-assets/logo.svg'), logo('#1F1714'));
fs.writeFileSync(pub('brand-assets/logo_dark.svg'), logo('#FFF8F5'));
fs.writeFileSync(pub('brand-assets/logo_thumbnail.svg'), thumb);

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
  sharp(Buffer.from(svg), { density: Math.ceil(72 * (size / 64) * 2) })
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
