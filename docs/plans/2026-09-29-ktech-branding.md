# KTech Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Chatwoot UI as KTech (no visible "Chatwoot"), with the Terracotta Sunset ombre theme in light and dark mode.

**Architecture:** Replace the product name at translation-load time (frontend `brandMessages`, backend `I18n::Backend::Simple#lookup` prepend) instead of editing locale files. Recolor by overriding the CSS variables that the "next" design system reads (`--blue-*`, `--slate-*`, `--gray-*`, surfaces) in one new SCSS file imported at the end of `_next-colors.scss`. Ombre is applied in three places only: sidebar, primary buttons, login page.

**Tech Stack:** Rails 7.1, Vue 3 + vue-i18n, Tailwind 3, SCSS, Vitest, RSpec, Node scripts (opentype.js, sharp, playwright via temporary installs).

**Spec:** `docs/superpowers/specs/2026-09-29-ktech-branding-design.md`

## Global Constraints

- Brand name comes from config: frontend `window.globalConfig.INSTALLATION_NAME`, backend `GlobalConfig.get_value('BRAND_NAME')`. Both are `KTech` via `config/installation_config.yml`. Never hardcode "KTech" in replacement logic.
- Do not edit any locale file (`config/locales/*.yml`, `app/javascript/**/i18n/locale/**`).
- Do not rename code identifiers (`$chatwoot`, `chatwootSDK`, `ChatwootApp`, `@chatwoot/*`, DB names).
- Name replacement must not touch interpolation placeholders (`{x}`, `%{x}`), vue-i18n linked keys (`@:key`, `@.lower:key`) or URLs (`http(s)://…`).
- Every text/background pair used for buttons and body text: WCAG AA ≥ 4.5:1.
- Tailwind only in Vue templates (no scoped CSS); theme overrides live in `_ktech-theme.scss`.
- Run everything inside the docker stack from this worktree (`E:/Project/CMS/cms-kai-ktech`), see `docs/reference/dev-setup.md`. Commands below assume `docker compose` is run from the worktree root.
- Commits: Conventional Commits, end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Palette (used by Tasks 5–6)

| Token | Light (r g b) | Dark (r g b) |
|---|---|---|
| blue-1..12 (terracotta) | 255 251 247 · 255 247 237 · 255 237 213 · 254 223 188 · 253 205 160 · 252 186 130 · 249 158 94 · 240 125 60 · **194 65 12** · 173 55 10 · **154 52 18** · 67 20 7 | 26 16 12 · 32 20 15 · 50 28 18 · 66 33 18 · 82 40 20 · 100 48 24 · 125 60 30 · 160 76 36 · **194 65 12** · 214 90 40 · **253 160 110** · 255 228 205 |
| slate/gray-1..12 (warm stone) | 253 252 251 · 250 248 246 · 243 239 236 · 236 231 227 · 229 223 218 · 221 214 208 · 207 198 190 · 188 177 168 · 145 134 125 · 134 123 114 · 100 90 82 · 41 32 27 | 20 17 16 · 26 22 20 · 35 30 27 · 42 36 33 · 50 43 39 · 59 51 46 · 73 63 57 · 97 85 77 · 112 100 92 · 126 114 105 · 183 172 164 · 240 234 229 |
| background / surface-1 / surface-2 | 250 246 242 · 255 252 249 · 255 255 255 | 28 22 19 · 22 18 16 · 25 20 18 |
| Ombre (logo) | `#FDBA74 → #EA580C → #7C2D12` | same |
| Ombre strong (buttons) | `#C2410C → #7C2D12` | same |
| Ombre sidebar | `#B03A0E → #8A3010 → #4A1A09` | same |
| Ombre soft (login bg) | `#FFF7ED → #FFEDD5 → #FED7AA` | n/a (`bg-n-background`) |

Checked contrast: white/blue-9 5.18 · blue-11/bg 6.80 · slate-11/bg 6.25 · dark blue-11/bg 8.89 · dark slate-11/bg 8.05 · sidebar text `255 237 213` on `#B03A0E` ≥ 4.9.

---

### Task 1: Frontend name replacement (`brandMessages`)

**Files:**
- Create: `app/javascript/shared/helpers/brandMessages.js`
- Test: `app/javascript/shared/helpers/specs/brandMessages.spec.js`
- Modify: `app/javascript/entrypoints/dashboard.js`, `v3app.js`, `widget.js`, `survey.js` (the `messages:` line of `createI18n`)

**Interfaces:**
- Produces: `brandMessages(messages: object, brandName?: string): object` and `installationBrandName(): string | undefined`.

- [ ] **Step 1: Write the failing test**

```js
// app/javascript/shared/helpers/specs/brandMessages.spec.js
import { brandMessages, installationBrandName } from '../brandMessages';

describe('brandMessages', () => {
  it('replaces Chatwoot in nested strings, any casing', () => {
    const messages = {
      en: { A: 'Welcome to Chatwoot', B: { C: 'CHATWOOT rocks', D: ['chatwoot'] } },
    };
    expect(brandMessages(messages, 'KTech')).toEqual({
      en: { A: 'Welcome to KTech', B: { C: 'KTech rocks', D: ['KTech'] } },
    });
  });

  it('keeps placeholders, linked keys and URLs intact', () => {
    const messages = {
      A: 'Update Chatwoot to {latestChatwootVersion}',
      B: '@:SETTINGS.CHATWOOT_TITLE',
      C: 'Docs: https://www.chatwoot.com/docs for Chatwoot',
      D: '@.lower:CHATWOOT.NAME and Chatwoot',
    };
    expect(brandMessages(messages, 'KTech')).toEqual({
      A: 'Update KTech to {latestChatwootVersion}',
      B: '@:SETTINGS.CHATWOOT_TITLE',
      C: 'Docs: https://www.chatwoot.com/docs for KTech',
      D: '@.lower:CHATWOOT.NAME and KTech',
    });
  });

  it('leaves non-string values and missing brand untouched', () => {
    const messages = { A: 1, B: null, C: 'Chatwoot' };
    expect(brandMessages(messages, 'KTech')).toEqual({ A: 1, B: null, C: 'KTech' });
    expect(brandMessages(messages, undefined)).toBe(messages);
    expect(brandMessages(messages, '')).toBe(messages);
  });

  it('does not mutate the input', () => {
    const messages = { A: 'Chatwoot' };
    brandMessages(messages, 'KTech');
    expect(messages.A).toBe('Chatwoot');
  });
});

describe('installationBrandName', () => {
  afterEach(() => { delete window.globalConfig; });

  it('reads INSTALLATION_NAME from window.globalConfig', () => {
    window.globalConfig = { INSTALLATION_NAME: 'KTech' };
    expect(installationBrandName()).toBe('KTech');
  });

  it('returns undefined without globalConfig', () => {
    expect(installationBrandName()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec vite pnpm vitest run app/javascript/shared/helpers/specs/brandMessages.spec.js`
Expected: FAIL, cannot resolve `../brandMessages`.

- [ ] **Step 3: Implement**

```js
// app/javascript/shared/helpers/brandMessages.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec vite pnpm vitest run app/javascript/shared/helpers/specs/brandMessages.spec.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire into the 4 entrypoints**

In each of `dashboard.js`, `v3app.js`, `widget.js`, `survey.js` add the import next to the `i18nMessages` import and change the `messages:` line:

```js
import {
  brandMessages,
  installationBrandName,
} from 'shared/helpers/brandMessages';
// ...
  messages: brandMessages(i18nMessages, installationBrandName()),
```

(`widget.js` and `survey.js` use relative imports; use `'../shared/helpers/brandMessages'` there to match the file's style.)

- [ ] **Step 6: Lint and commit**

Run: `docker compose exec vite pnpm eslint app/javascript/shared/helpers/brandMessages.js app/javascript/shared/helpers/specs/brandMessages.spec.js app/javascript/entrypoints`
Expected: no errors.

```bash
git add app/javascript/shared/helpers/brandMessages.js app/javascript/shared/helpers/specs/brandMessages.spec.js app/javascript/entrypoints
git commit -m "feat(branding): replace product name in UI translations at load time"
```

---

### Task 2: Backend name replacement and hardcoded strings

**Files:**
- Create: `config/initializers/ktech_branded_i18n.rb`
- Test: `spec/initializers/ktech_branded_i18n_spec.rb`
- Modify: `app/views/layouts/mailer/base.liquid`, `app/views/devise/mailer/confirmation_instructions.html.erb`, `app/mailers/application_mailer.rb`, `public/manifest.json`, plus user-visible hits from the audit in Step 6.

**Interfaces:**
- Produces: `Ktech::BrandedI18n` (prepended to `I18n::Backend::Simple`), `Ktech::BrandedI18n.brand(text, brand_name) -> String`.

- [ ] **Step 1: Write the failing test**

```ruby
# spec/initializers/ktech_branded_i18n_spec.rb
require 'rails_helper'

RSpec.describe Ktech::BrandedI18n do
  before do
    I18n.backend.store_translations(:en, ktech_spec: {
                                      plain: 'Hello there',
                                      branded: 'Welcome to Chatwoot',
                                      placeholder: 'Hi %{chatwoot_name}, open https://www.chatwoot.com in Chatwoot',
                                      nested: { deep: 'chatwoot inside' }
                                    })
    allow(GlobalConfig).to receive(:get_value).with('BRAND_NAME').and_return('KTech')
  end

  it 'replaces the product name in translated strings' do
    expect(I18n.t('ktech_spec.branded')).to eq('Welcome to KTech')
  end

  it 'keeps placeholders and URLs intact' do
    expect(I18n.t('ktech_spec.placeholder', chatwoot_name: 'Ana'))
      .to eq('Hi Ana, open https://www.chatwoot.com in KTech')
  end

  it 'does not query config for strings without the product name' do
    expect(I18n.t('ktech_spec.plain')).to eq('Hello there')
    expect(GlobalConfig).not_to have_received(:get_value)
  end

  it 'leaves non-string results untouched' do
    expect(I18n.t('ktech_spec.nested')).to eq(deep: 'chatwoot inside')
  end

  it 'keeps the original text when no brand is configured' do
    allow(GlobalConfig).to receive(:get_value).with('BRAND_NAME').and_return(nil)
    expect(I18n.t('ktech_spec.branded')).to eq('Welcome to Chatwoot')
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -e RAILS_ENV=test -e POSTGRES_DATABASE=chatwoot_test rails bundle exec rspec spec/initializers/ktech_branded_i18n_spec.rb`
Expected: FAIL, `uninitialized constant Ktech::BrandedI18n`.

- [ ] **Step 3: Implement**

```ruby
# config/initializers/ktech_branded_i18n.rb
# Shows the configured BRAND_NAME wherever a translation mentions the upstream
# product name, without editing locale files (ADR-007).
module Ktech
  module BrandedI18n
    PRODUCT_NAME = /chatwoot/i
    # Captured so String#split keeps them at odd indexes: placeholders and URLs.
    PROTECTED = %r{(%\{[^}]*\}|https?://\S+)}

    def self.brand(text, brand_name)
      text.split(PROTECTED).each_with_index.map { |part, index| index.odd? ? part : part.gsub(PRODUCT_NAME, brand_name) }.join
    end

    protected

    def lookup(locale, key, scope = [], options = {})
      result = super
      return result unless result.is_a?(String) && result.match?(PRODUCT_NAME)

      brand_name = GlobalConfig.get_value('BRAND_NAME').presence
      brand_name ? Ktech::BrandedI18n.brand(result, brand_name) : result
    end
  end
end

I18n::Backend::Simple.prepend(Ktech::BrandedI18n)
```

- [ ] **Step 4: Run test to verify it passes**

Run: same as Step 2. Expected: PASS (5 examples).

- [ ] **Step 5: Hardcoded defaults**

- `app/views/layouts/mailer/base.liquid:95`: `{% assign brand_name = 'Chatwoot' %}` → `{% assign brand_name = 'KTech' %}`
- `app/views/devise/mailer/confirmation_instructions.html.erb:2`: `|| 'Chatwoot'` → `|| 'KTech'`
- `app/mailers/application_mailer.rb:4`: `'Chatwoot <accounts@chatwoot.com>'` → `'KTech <noreply@ktech.vn>'` (fallback only; real sender comes from `MAILER_SENDER_EMAIL`)
- `public/manifest.json`: `"name"` and `"short_name"` → `"KTech"`

- [ ] **Step 6: Audit remaining user-visible hits**

Run: `grep -rn "Chatwoot" app/views app/mailers public/*.json public/*.html | grep -vE "Chatwoot\.|ChatwootApp|ChatwootHub|chatwoot_|\\\$chatwoot|chatwootSDK|window\.chatwoot"`
For each hit that renders as text to a user (HTML text, email text, `<title>`, alt text), replace the literal with `KTech` or, in ERB, with `GlobalConfig.get_value('BRAND_NAME')`. Leave API JSON keys and Ruby constants alone. Record every changed file in the commit message body.

- [ ] **Step 7: Run affected specs and commit**

Run: `docker compose exec -e RAILS_ENV=test -e POSTGRES_DATABASE=chatwoot_test rails bundle exec rspec spec/initializers/ktech_branded_i18n_spec.rb spec/mailers`
Expected: all green. If a mailer spec asserts the literal "Chatwoot", check whether the new text is correct and update the expectation to `KTech`.

```bash
git add config/initializers/ktech_branded_i18n.rb spec/initializers/ktech_branded_i18n_spec.rb app/views app/mailers public/manifest.json spec/mailers
git commit -m "feat(branding): show brand name in backend translations and emails"
```

---

### Task 3: Hide the Chatwoot update banner

**Files:**
- Modify: `app/javascript/dashboard/App.vue` (the `<UpdateBanner>` line, ~141)

Context: the sidebar changelog is already hidden when `isACustomBrandedInstance` (installation name ≠ "Chatwoot"); `PaymentPendingBanner` only shows on Chatwoot Cloud. Only `UpdateBanner` ("update Chatwoot to …") remains.

- [ ] **Step 1: Gate the banner**

Add `isACustomBrandedInstance: 'globalConfig/isACustomBrandedInstance'` to the component's `mapGetters` and change the template line to:

```vue
<UpdateBanner
  v-if="!isACustomBrandedInstance"
  :latest-chatwoot-version="latestChatwootVersion"
/>
```

- [ ] **Step 2: Verify and commit**

Run: `docker compose exec vite pnpm eslint app/javascript/dashboard/App.vue` → no errors.
Manual check happens in Task 7 (banner absent for admin).

```bash
git add app/javascript/dashboard/App.vue
git commit -m "feat(branding): hide upstream update banner on branded installs"
```

---

### Task 4: Logo, favicon and PWA icons

**Files:**
- Create: `script/ktech/generate_brand_assets.cjs`
- Overwrite: `public/brand-assets/logo.svg`, `logo_dark.svg`, `logo_thumbnail.svg`; `public/favicon-{16,32,96,512}x*.png`, `public/favicon-badge-{16,32,96}x*.png`, `public/apple-icon*.png`, `public/apple-touch-icon*.png`, `public/android-icon-*.png`, `public/ms-icon-*.png`

- [ ] **Step 1: Write the generator**

```js
// script/ktech/generate_brand_assets.cjs
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

const word = (text, x, fill) =>
  `<path d="${font.getPath(text, x, 35, 30).toPathData(2)}" fill="${fill}"/>`;

const kWidth = font.getAdvanceWidth('K', 30);
const width = Math.ceil(58 + font.getAdvanceWidth('KTech', 30) + 4);

const logo = ({ k, tech, from, to }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48" viewBox="0 0 ${width} 48">
  ${MARK}
  <defs><linearGradient id="kt-word" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  ${word('K', 58, k)}
  ${word('Tech', 58 + kWidth, tech)}
</svg>
`;

fs.writeFileSync(pub('brand-assets/logo.svg'), logo({ k: '#431407', tech: 'url(#kt-word)', from: '#EA580C', to: '#7C2D12' }));
fs.writeFileSync(pub('brand-assets/logo_dark.svg'), logo({ k: '#FFF7ED', tech: 'url(#kt-word)', from: '#FDBA74', to: '#FB923C' }));
const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${MARK}</svg>\n`;
fs.writeFileSync(pub('brand-assets/logo_thumbnail.svg'), thumb);

const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${MARK}
  <circle cx="39" cy="9" r="8" fill="#DC2626" stroke="#fff" stroke-width="2.5"/></svg>`;

const icons = {
  'favicon-16x16.png': 16, 'favicon-32x32.png': 32, 'favicon-96x96.png': 96, 'favicon-512x512.png': 512,
  'apple-icon.png': 192, 'apple-icon-precomposed.png': 192, 'apple-touch-icon.png': 180, 'apple-touch-icon-precomposed.png': 180,
  'apple-icon-57x57.png': 57, 'apple-icon-60x60.png': 60, 'apple-icon-72x72.png': 72, 'apple-icon-76x76.png': 76,
  'apple-icon-114x114.png': 114, 'apple-icon-120x120.png': 120, 'apple-icon-144x144.png': 144, 'apple-icon-152x152.png': 152,
  'apple-icon-180x180.png': 180, 'android-icon-36x36.png': 36, 'android-icon-48x48.png': 48, 'android-icon-72x72.png': 72,
  'android-icon-96x96.png': 96, 'android-icon-144x144.png': 144, 'android-icon-192x192.png': 192,
  'ms-icon-70x70.png': 70, 'ms-icon-144x144.png': 144, 'ms-icon-150x150.png': 150, 'ms-icon-310x310.png': 310,
};
const badges = { 'favicon-badge-16x16.png': 16, 'favicon-badge-32x32.png': 32, 'favicon-badge-96x96.png': 96 };

(async () => {
  for (const [name, size] of Object.entries(icons)) {
    await sharp(Buffer.from(thumb), { density: 72 * (size / 48) * 2 }).resize(size, size).png().toFile(pub(name));
  }
  for (const [name, size] of Object.entries(badges)) {
    await sharp(Buffer.from(badge), { density: 72 * (size / 48) * 2 }).resize(size, size).png().toFile(pub(name));
  }
  console.log(`logos + ${Object.keys(icons).length + Object.keys(badges).length} icons written`);
})();
```

- [ ] **Step 2: Generate**

Run:
```bash
npm i --no-save --prefix tmp/ktech-brand opentype.js@1 sharp@0.33 @fontsource/inter@5
node script/ktech/generate_brand_assets.cjs
```
Expected: `logos + 30 icons written`. If `inter-latin-700-normal.woff` is not found, list `tmp/ktech-brand/node_modules/@fontsource/inter/files/` and use the 700-weight latin `.woff` file name there.

- [ ] **Step 3: Visually check**

Open `public/brand-assets/logo.svg`, `logo_dark.svg` (on a dark background) and `public/favicon-32x32.png` with the Read tool (images render). Expected: mark and "KTech" wordmark aligned, no clipping; favicon legible.

- [ ] **Step 4: Commit**

```bash
git add script/ktech/generate_brand_assets.cjs public/brand-assets public/*.png
git commit -m "feat(branding): add KTech logo, favicons and PWA icons"
```

---

### Task 5: Terracotta theme (CSS variables, light and dark)

**Files:**
- Create: `app/javascript/dashboard/assets/scss/_ktech-theme.scss`
- Create: `script/ktech/check_contrast.mjs`
- Modify: `app/javascript/dashboard/assets/scss/_next-colors.scss` (append one import at end), `theme/colors.js` (`woot` ramp, `n.brand`)

**Interfaces:**
- Produces: CSS custom properties from the Palette table; `.ktech-sidebar` scope (used by Task 6).

- [ ] **Step 1: Write the contrast check (fails until the theme exists)**

```js
// script/ktech/check_contrast.mjs
// Usage: node script/ktech/check_contrast.mjs  — exits 1 if any pair < 4.5:1
import fs from 'node:fs';

const scss = fs.readFileSync(new URL('../../app/javascript/dashboard/assets/scss/_ktech-theme.scss', import.meta.url), 'utf8');
const block = selector => {
  const start = scss.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = scss.slice(start, scss.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)].map(m => [m[1], [+m[2], +m[3], +m[4]]]));
};
const lum = c => { const v = c.map(x => x / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const WHITE = [255, 255, 255];

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
  ['sidebar slate-11 / top #B03A0E', sidebar['slate-11'], [176, 58, 14]],
  ['sidebar slate-12 / top #B03A0E', sidebar['slate-12'], [176, 58, 14]],
];
let failed = false;
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  failed ||= r < 4.5;
  console.log(`${r < 4.5 ? 'FAIL' : 'ok  '} ${r.toFixed(2)}  ${name}`);
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node script/ktech/check_contrast.mjs`
Expected: error `ENOENT … _ktech-theme.scss`.

- [ ] **Step 3: Create the theme**

```scss
// app/javascript/dashboard/assets/scss/_ktech-theme.scss
// KTech "Terracotta Sunset" (ADR-007). Overrides the next design system
// variables from _next-colors.scss; imported at the end of that file.
// scss-lint:disable PropertySortOrder
@layer base {
  :root {
    --blue-1: 255 251 247;
    --blue-2: 255 247 237;
    --blue-3: 255 237 213;
    --blue-4: 254 223 188;
    --blue-5: 253 205 160;
    --blue-6: 252 186 130;
    --blue-7: 249 158 94;
    --blue-8: 240 125 60;
    --blue-9: 194 65 12;
    --blue-10: 173 55 10;
    --blue-11: 154 52 18;
    --blue-12: 67 20 7;

    --slate-1: 253 252 251;
    --slate-2: 250 248 246;
    --slate-3: 243 239 236;
    --slate-4: 236 231 227;
    --slate-5: 229 223 218;
    --slate-6: 221 214 208;
    --slate-7: 207 198 190;
    --slate-8: 188 177 168;
    --slate-9: 145 134 125;
    --slate-10: 134 123 114;
    --slate-11: 100 90 82;
    --slate-12: 41 32 27;

    --gray-1: 253 252 251;
    --gray-2: 250 248 246;
    --gray-3: 243 239 236;
    --gray-4: 236 231 227;
    --gray-5: 229 223 218;
    --gray-6: 221 214 208;
    --gray-7: 207 198 190;
    --gray-8: 188 177 168;
    --gray-9: 145 134 125;
    --gray-10: 134 123 114;
    --gray-11: 100 90 82;
    --gray-12: 41 32 27;

    --background-color: 250 246 242;
    --surface-1: 255 252 249;
    --surface-2: 255 255 255;
    --text-blue: 67 20 7;
    --border-container: 237 231 226;
    --border-strong: 228 220 213;
    --border-weak: 236 230 225;
    --border-blue-strong: 124 45 18;
    --solid-blue: 255 237 213;
    --solid-blue-2: 255 251 247;
    --label-background: 247 242 238;
    --border-blue: 194, 65, 12, 0.5;
  }

  .dark {
    --blue-1: 26 16 12;
    --blue-2: 32 20 15;
    --blue-3: 50 28 18;
    --blue-4: 66 33 18;
    --blue-5: 82 40 20;
    --blue-6: 100 48 24;
    --blue-7: 125 60 30;
    --blue-8: 160 76 36;
    --blue-9: 194 65 12;
    --blue-10: 214 90 40;
    --blue-11: 253 160 110;
    --blue-12: 255 228 205;

    --slate-1: 20 17 16;
    --slate-2: 26 22 20;
    --slate-3: 35 30 27;
    --slate-4: 42 36 33;
    --slate-5: 50 43 39;
    --slate-6: 59 51 46;
    --slate-7: 73 63 57;
    --slate-8: 97 85 77;
    --slate-9: 112 100 92;
    --slate-10: 126 114 105;
    --slate-11: 183 172 164;
    --slate-12: 240 234 229;

    --gray-1: 20 17 16;
    --gray-2: 26 22 20;
    --gray-3: 35 30 27;
    --gray-4: 42 36 33;
    --gray-5: 50 43 39;
    --gray-6: 59 51 46;
    --gray-7: 73 63 57;
    --gray-8: 97 85 77;
    --gray-9: 112 100 92;
    --gray-10: 126 114 105;
    --gray-11: 183 172 164;
    --gray-12: 240 234 229;

    --background-color: 28 22 19;
    --surface-1: 22 18 16;
    --surface-2: 25 20 18;
    --text-blue: 255 228 205;
    --border-strong: 52 44 40;
    --border-weak: 38 32 29;
    --border-blue-strong: 253 186 116;
    --solid-blue: 80 38 18;
    --solid-blue-2: 32 24 20;
    --label-background: 40 33 29;
    --border-blue: 194, 65, 12, 0.5;
  }

  // Ombre sidebar: re-scope the text/hover variables so every Tailwind class
  // inside the sidebar (text-n-slate-11, bg-n-alpha-2, ...) reads on dark orange.
  .ktech-sidebar {
    background-image: linear-gradient(180deg, #b03a0e 0%, #8a3010 45%, #4a1a09 100%);
    --background-color: 74 26 9;
    --slate-10: 254 215 170;
    --slate-11: 255 237 213;
    --slate-12: 255 251 247;
    --blue-9: 255 247 237;
    --blue-11: 255 237 213;
    --border-weak: 138 48 16;
    --alpha-1: 255, 255, 255, 0.08;
    --alpha-2: 255, 255, 255, 0.14;
  }
}
```

(Check the exact variable names against `_next-colors.scss` before saving: every `--name` above must already exist there, otherwise drop it.)

- [ ] **Step 4: Import it and point legacy colors at the theme**

Append at the very end of `app/javascript/dashboard/assets/scss/_next-colors.scss`:

```scss
// KTech theme overrides (ADR-007)
@import 'ktech-theme';
```

In `theme/colors.js`:
- `brand: '#2781F6'` → `brand: 'rgb(var(--blue-9) / <alpha-value>)'`
- replace the `woot` ramp values with: `25: '#FFFBF7', 50: '#FFF7ED', 75: '#FFEDD5', 100: '#FED7AA', 200: '#FDBA74', 300: '#FB923C', 400: '#EA580C', 500: '#C2410C', 600: '#9A3412', 700: '#7C2D12', 800: '#5C1F0B', 900: '#431407'`

- [ ] **Step 5: Run the contrast check**

Run: `node script/ktech/check_contrast.mjs`
Expected: 10 lines, all `ok`, exit 0.

- [ ] **Step 6: Build check and commit**

Run: `docker compose restart vite` then `curl -s -o /dev/null -w "%{http_code}" localhost:3000/app/login` → `200`, and `docker compose logs vite --tail 30` shows no SCSS error.

```bash
git add app/javascript/dashboard/assets/scss/_ktech-theme.scss app/javascript/dashboard/assets/scss/_next-colors.scss theme/colors.js script/ktech/check_contrast.mjs
git commit -m "feat(branding): add Terracotta Sunset theme for light and dark mode"
```

---

### Task 6: Ombre accents (sidebar, primary button, login)

**Files:**
- Modify: `tailwind.config.js` (add `backgroundImage` to `theme`)
- Modify: `app/javascript/dashboard/components-next/sidebar/Sidebar.vue:949` (root `<aside>` class)
- Modify: `app/javascript/dashboard/components-next/button/Button.vue:103-104` (`blue.solid`)
- Modify: `app/javascript/v3/views/login/Index.vue:293` (page background)

**Interfaces:**
- Consumes: `.ktech-sidebar` scope from Task 5.
- Produces: Tailwind classes `bg-ktech-ombre`, `bg-ktech-ombre-strong`, `bg-ktech-ombre-soft`.

- [ ] **Step 1: Tailwind background images**

In `tailwind.config.js`, inside `theme` (next to `fontSize`):

```js
    backgroundImage: {
      ...defaultTheme.backgroundImage,
      'ktech-ombre':
        'linear-gradient(135deg, #FDBA74 0%, #EA580C 50%, #7C2D12 100%)',
      'ktech-ombre-strong': 'linear-gradient(135deg, #C2410C 0%, #7C2D12 100%)',
      'ktech-ombre-soft':
        'linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 45%, #FED7AA 100%)',
    },
```

- [ ] **Step 2: Apply**

- `Sidebar.vue` `<aside>` static class: add `ktech-sidebar` right after `bg-n-background`.
- `Button.vue` `blue.solid`: `'bg-n-brand text-white …'` → `'bg-n-brand bg-ktech-ombre-strong text-white …'` (keep the rest of the string).
- `login/Index.vue`: `bg-n-brand/5 dark:bg-n-background` → `bg-ktech-ombre-soft dark:bg-none dark:bg-n-background`.

- [ ] **Step 3: Check it renders**

Run: `docker compose exec vite pnpm eslint app/javascript/dashboard/components-next/sidebar/Sidebar.vue app/javascript/dashboard/components-next/button/Button.vue app/javascript/v3/views/login/Index.vue` → no errors.
Then take a screenshot of `/app/login` and of the dashboard after login (Task 7 script `--only login,inbox`), open the PNGs with Read. Expected: login with soft ombre; sidebar orange→brown with readable cream text, hover and active items visible; primary buttons gradient. If sidebar items are unreadable, find the class they use in `components-next/sidebar/SidebarGroup*.vue` and add the matching variable to the `.ktech-sidebar` block (never edit the component classes).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js app/javascript/dashboard/components-next/sidebar/Sidebar.vue app/javascript/dashboard/components-next/button/Button.vue app/javascript/v3/views/login/Index.vue app/javascript/dashboard/assets/scss/_ktech-theme.scss
git commit -m "feat(branding): add ombre sidebar, primary buttons and login background"
```

---

### Task 7: Brand audit (Playwright) and docs

**Files:**
- Create: `script/ktech/brand_audit.cjs`
- Modify: `docs/STATUS.md`, `docs/LESSONS.md` (only if a mistake happened), `docs/reference/dev-setup.md` (link to scripts)

- [ ] **Step 1: Write the audit script**

```js
// script/ktech/brand_audit.cjs
// Logs in with the seed user, visits key pages in vi/en and light/dark, fails
// if any visible text or title contains "chatwoot", and saves screenshots.
//   npm i --no-save --prefix tmp/ktech-brand playwright@1 && npx --prefix tmp/ktech-brand playwright install chromium
//   node script/ktech/brand_audit.cjs [--only login,inbox]
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '../..');
const { chromium } = createRequire(path.join(root, 'tmp/ktech-brand/node_modules/'))('playwright');
const BASE = process.env.KTECH_BASE_URL || 'http://localhost:3000';
const OUT = path.join(root, 'tmp/ktech-brand/screens');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1]?.split(',');

const PAGES = {
  login: '/app/login',
  inbox: '/app/accounts/1/dashboard',
  conversation: '/app/accounts/1/conversations/1',
  contacts: '/app/accounts/1/contacts',
  reports: '/app/accounts/1/reports/overview',
  inboxes: '/app/accounts/1/settings/inboxes/list',
  agents: '/app/accounts/1/settings/agents/list',
  profile: '/app/accounts/1/profile/settings',
  widget: '/widget?website_token=__WIDGET_TOKEN__',
};

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const failures = [];
  for (const locale of ['vi', 'en']) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: theme, locale, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      for (const [name, url] of Object.entries(PAGES)) {
        if (only && !only.includes(name)) continue;
        if (name !== 'login' && !(await page.evaluate(() => !!localStorage.getItem('cw_d_session_info')).catch(() => false))) {
          await page.goto(`${BASE}/app/login`);
          await page.fill('input[name="email_address"]', 'john@acme.inc');
          await page.fill('input[name="password"]', 'Password1!');
          await page.click('button[type="submit"]');
          await page.waitForURL(/\/app\/accounts\//, { timeout: 60000 });
        }
        await page.goto(`${BASE}${url.replace('__WIDGET_TOKEN__', process.env.KTECH_WIDGET_TOKEN || '')}`, { waitUntil: 'networkidle', timeout: 120000 });
        const text = `${await page.title()}\n${await page.evaluate(() => document.body.innerText)}`;
        const hits = text.split('\n').filter(line => /chatwoot/i.test(line));
        if (hits.length) failures.push(`${locale}/${theme}/${name}: ${hits.slice(0, 3).join(' | ')}`);
        await page.screenshot({ path: path.join(OUT, `${name}-${locale}-${theme}.png`) });
      }
      await context.close();
    }
  }
  await browser.close();
  console.log(failures.length ? `FAIL\n${failures.join('\n')}` : 'OK: no visible "chatwoot"');
  process.exit(failures.length ? 1 : 0);
})();
```

Before the first run, confirm the selectors against `app/javascript/v3/views/login/Index.vue` (email/password input names, submit button) and the localStorage session key in `app/javascript/dashboard/store/utils/api.js` or the auth helper; adjust the script to what the code uses. Set the UI locale per run with the user's profile locale if `locale` in the browser context does not switch the dashboard language (Chatwoot uses the account/user locale): in that case add a step that `PUT /api/v1/profile` with `{ profile: { ui_settings: { locale } } }` or change account locale via the API before visiting pages. Get the widget token with `docker compose exec rails bundle exec rails runner 'puts Channel::WebWidget.first&.website_token'`.

- [ ] **Step 2: Run the audit**

Run: `node script/ktech/brand_audit.cjs`
Expected: `OK: no visible "chatwoot"`, exit 0, 36 screenshots in `tmp/ktech-brand/screens/`.
For every FAIL line: find the source string (`grep -rn "<text>" app/javascript app/views`) and fix it at the source category (translation → should already be covered; hardcoded template text → replace with `$t` key or brand name; backend → Task 2 pattern). Re-run until OK.

- [ ] **Step 3: Review screenshots**

Open a sample with Read: `login-vi-light`, `inbox-vi-light`, `inbox-vi-dark`, `conversation-vi-light`, `widget-vi-light`. Look for leftover blue, unreadable text, broken gradients. Fix in `_ktech-theme.scss` only.

- [ ] **Step 4: Full related test run**

Run:
- `docker compose exec vite pnpm vitest run app/javascript/shared app/javascript/dashboard/components-next/button`
- `docker compose exec -e RAILS_ENV=test -e POSTGRES_DATABASE=chatwoot_test rails bundle exec rspec spec/initializers spec/mailers`
- `node script/ktech/check_contrast.mjs`
Expected: all green.

- [ ] **Step 5: Docs and commit**

- `docs/STATUS.md`: B-01 → `done` with a one-line note (what was verified: audit OK, contrast OK, test counts).
- `docs/reference/dev-setup.md`: add section "Script KTech" listing `generate_brand_assets.cjs`, `check_contrast.mjs`, `brand_audit.cjs` and their install command.

```bash
git add script/ktech/brand_audit.cjs docs
git commit -m "test(branding): add brand audit script and mark B-01 done"
```
