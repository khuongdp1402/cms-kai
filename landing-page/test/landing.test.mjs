import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

test('index.html contains no forbidden words', () => {
  for (const word of ['localhost', 'KChat', 'KTech', 'Chatwoot', 'simulate']) {
    assert.ok(!html.includes(word), `found ${word}`);
  }
});

test('every relative src and href points to an existing file', () => {
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(m => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    if (/^(https?:|#|mailto:|tel:|data:|$)/.test(ref)) continue;
    const path = ref.split(/[?#]/)[0];
    assert.ok(existsSync(join(root, path)), `missing ${ref}`);
  }
});

test('the three plan prices are 299.000đ, 699.000đ and 1.990.000đ and match PLAN_PRICES', () => {
  for (const p of ['299.000đ', '699.000đ', '1.990.000đ'])
    assert.ok(html.includes(p), p);
  const rb = readFileSync(
    join(root, '..', 'app/services/casso/webhook_handler.rb'),
    'utf8'
  );
  const body = rb.match(/PLAN_PRICES\s*=\s*\{([^}]*)\}/)[1];
  const prices = Object.fromEntries(
    [...body.matchAll(/'(\w+)'\s*=>\s*([\d_]+)/g)].map(m => [
      m[1],
      Number(m[2].replace(/_/g, '')),
    ])
  );
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  assert.deepEqual(
    [prices.starter, prices.growth, prices.enterprise].map(fmt),
    ['299.000đ', '699.000đ', '1.990.000đ']
  );
});

test('the video element has the poster and an mp4 source', () => {
  const video = html.match(/<video[\s\S]*?<\/video>/)[0];
  assert.match(video, /poster="assets\/kalo-brand-poster\.jpg"/);
  assert.match(
    video,
    /<source[^>]+src="assets\/kalo-brand-24s\.mp4"[^>]+type="video\/mp4"/
  );
});

test('script.js computes the app url from the hostname', async () => {
  const { appUrl } = await import(pathToFileURL(join(root, 'script.js')).href);
  assert.equal(appUrl('www.example.vn'), 'https://app.example.vn');
  assert.equal(appUrl('example.vn'), 'https://app.example.vn');
});

test('plan cards contain no vague unverifiable promises', () => {
  const plans = [...html.matchAll(/<div class="plan[\s\S]*?<\/ul>/g)].map(
    m => m[0]
  );
  assert.equal(plans.length, 3);
  for (const card of plans) {
    for (const s of ['Đội ngũ lớn', 'Hỗ trợ riêng', 'đồng đội'])
      assert.ok(!card.includes(s), s);
  }
});

test('signup links point to /app/auth/signup without an ignored plan parameter', () => {
  const links = [
    ...html.matchAll(/data-app="(\/app\/auth\/signup[^"]*)"/g),
  ].map(m => m[1]);
  assert.ok(links.length >= 3);
  for (const l of links) assert.equal(l, '/app/auth/signup');
  assert.ok(!html.includes('TODO(task-13)'));
});

test('landing does not promise automatic reconciliation of shop orders', () => {
  assert.ok(!html.includes('đơn tự cập nhật khi tiền về'));
  assert.ok(!html.includes('Tiền về là đơn được cập nhật'));
  assert.match(html, /Đã nhận tiền/);
});
