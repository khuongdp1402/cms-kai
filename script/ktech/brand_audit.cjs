// Visits key pages in vi/en and light/dark, fails if any visible text or title
// contains "chatwoot", and saves screenshots to tmp/ktech-brand/screens.
// Install the tooling once (all packages in one command, npm prunes the rest):
//   npm i --no-save --prefix tmp/ktech-brand opentype.js@1 sharp@0.33 @fontsource/inter@5 playwright@1
//   npx --prefix tmp/ktech-brand playwright install chromium
// Run: KTECH_WIDGET_TOKEN=<website_token> node script/ktech/brand_audit.cjs [--only=login,inbox]
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'tmp/ktech-brand/node_modules/'));
const { chromium, request } = req('playwright');

const BASE = process.env.KTECH_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.KTECH_AUDIT_EMAIL || 'john@acme.inc';
const PASSWORD = process.env.KTECH_AUDIT_PASSWORD || 'Password1!';
const OUT = path.join(root, 'tmp/ktech-brand/screens');
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const PAGES = {
  login: '/app/login',
  inbox: '/app/accounts/1/dashboard',
  conversation: '/app/accounts/1/conversations/1',
  contacts: '/app/accounts/1/contacts',
  reports: '/app/accounts/1/reports/overview',
  inboxes: '/app/accounts/1/settings/inboxes/list',
  agents: '/app/accounts/1/settings/agents/list',
  profile: '/app/accounts/1/profile/settings',
  widget: `/widget?website_token=${process.env.KTECH_WIDGET_TOKEN || ''}`,
};

// One API session is shared by every browser context (through the dashboard
// cookie) and signed out at the end, so runs never pile up sessions.
const signIn = async () => {
  const api = await request.newContext({ baseURL: BASE });
  const res = await api.post('/auth/sign_in', {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!res.ok()) throw new Error(`sign in failed: ${res.status()}`);
  const h = res.headers();
  const headers = {
    'access-token': h['access-token'],
    'token-type': h['token-type'],
    client: h.client,
    expiry: h.expiry,
    uid: h.uid,
  };
  return { api, headers };
};

// Chatwoot reads the dashboard language from the user's ui_settings.locale.
const setUserLocale = async ({ api, headers }, locale) => {
  const profile = await (await api.get('/api/v1/profile', { headers })).json();
  const res = await api.put('/api/v1/profile', {
    headers,
    data: { profile: { ui_settings: { ...profile.ui_settings, locale } } },
  });
  if (!res.ok()) throw new Error(`cannot set locale ${locale}: ${res.status()}`);
};

const sessionCookie = headers => ({
  name: 'cw_d_session_info',
  value: encodeURIComponent(JSON.stringify(headers)),
  url: BASE,
});

const auditPage = async (page, name, url, label, failures) => {
  await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 600000 });
  // A blank page has no "chatwoot" either; wait for real content and fail if none.
  const rendered = await page
    .waitForFunction(() => document.body.innerText.trim().length > 40, null, {
      timeout: 300000,
    })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(3000);
  const title = await page.title();
  const body = await page.evaluate(() => document.body.innerText);
  if (!rendered) failures.push(`${label}/${name}: page rendered no content`);
  const hits = `${title}\n${body}`
    .split('\n')
    .filter(line => /chatwoot/i.test(line));
  if (hits.length) failures.push(`${label}/${name}: ${hits.slice(0, 3).join(' | ')}`);
  await page.screenshot({ path: path.join(OUT, `${name}-${label.replace('/', '-')}.png`) });
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const session = await signIn();
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const locale of ['vi', 'en']) {
      await setUserLocale(session, locale);
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          colorScheme: theme,
          locale,
          viewport: { width: 1440, height: 900 },
        });
        const page = await context.newPage();
        const label = `${locale}/${theme}`;
        for (const [name, url] of Object.entries(PAGES)) {
          if (only && !only.includes(name)) continue;
          // The login page is audited signed out; every other page signed in.
          if (name !== 'login') await context.addCookies([sessionCookie(session.headers)]);
          await auditPage(page, name, url, label, failures);
        }
        await context.close();
      }
    }
    await setUserLocale(session, 'vi');
  } finally {
    await browser.close();
    await session.api.delete('/auth/sign_out', { headers: session.headers });
    await session.api.dispose();
  }
  // eslint-disable-next-line no-console
  console.log(failures.length ? `FAIL\n${failures.join('\n')}` : 'OK: no visible "chatwoot"');
  process.exit(failures.length ? 1 : 0);
})();
