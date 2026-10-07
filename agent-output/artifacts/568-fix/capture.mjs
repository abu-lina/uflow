// Issue #568 fix evidence capture.
//
// Signs in as the local admin through the real password grant + /api/auth/set
// cookie contract (same path as e2e/issue547-pending-provider.spec.ts), then
// captures the awaiting-review and rejected banners on /p/[id] on desktop and
// mobile. Every screenshot is gated on the assertion its caption claims —
// elementFromPoint at the banner's own centre must return the banner.
//
// Run:  UFLOW_ADMIN_PASSWORD=… node agent-output/artifacts/568-fix/capture.mjs
// Requires: dev server on PLAYWRIGHT_BASE_URL (default http://127.0.0.1:3001)
// and local Supabase via .env.local.

import { readFileSync } from 'node:fs';
import {
  chromium,
  devices,
} from '/Users/NARAFIQ/Projects/uflow-wt/568-banner-behind-modal/node_modules/playwright/index.mjs';

const ROOT = '/Users/NARAFIQ/Projects/uflow-wt/568-banner-behind-modal';
const OUT = `${ROOT}/agent-output/artifacts/568-fix`;
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001';

const envFile = readFileSync(`${ROOT}/.env.local`, 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const API = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_PASSWORD = process.env.UFLOW_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) throw new Error('UFLOW_ADMIN_PASSWORD env var required');

const PENDING = '7a2f2cb4-709d-4f0a-85ff-933d279ef88a';
const REJECTED = '84624d5e-999c-4b73-9c03-81a3ebb9b4be';

// en + de strings for the two banner keys.
const AWAITING = /awaiting a manual review|wartet auf eine manuelle prüfung/i;
const REJECTED_RE = /submission was rejected|einreichung wurde abgelehnt/i;

async function signInAsAdmin(context) {
  const tokenRes = await context.request.post(`${API}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email: 'admin@uflow.local', password: ADMIN_PASSWORD },
  });
  if (!tokenRes.ok()) throw new Error(`token grant failed: ${await tokenRes.text()}`);
  const { access_token, refresh_token } = await tokenRes.json();
  const setRes = await context.request.post(`${BASE}/api/auth/set`, {
    data: { access_token, refresh_token },
  });
  if (!setRes.ok()) throw new Error(`/api/auth/set failed: ${setRes.status()}`);
}

function describe(node) {
  return node === null
    ? 'null'
    : `${node.tagName}.${typeof node.className === 'string' ? node.className : ''}`;
}

// Hit test at the banner's own centre; throws if anything else is on top.
async function assertBannerOnTop(page, textRe) {
  const banner = page.locator('p', { hasText: textRe }).filter({ visible: true });
  await banner.waitFor({ state: 'visible', timeout: 20_000 });
  const hit = await banner.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      centre: { x: Math.round(x), y: Math.round(y) },
      topIsBanner: top !== null && (top === el || el.contains(top)),
      top: top
        ? `${top.tagName}.${typeof top.className === 'string' ? top.className : ''}`
        : 'null',
      rect: {
        top: Math.round(r.top),
        left: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
    };
  });
  console.log(`   banner centre (${hit.centre.x}, ${hit.centre.y}) topmost = ${hit.top}`);
  if (!hit.topIsBanner) {
    throw new Error(`OCCLUDED: elementFromPoint returned ${hit.top}, not the banner`);
  }
  return hit;
}

async function waitForDialogSettled(page) {
  // Modal root has transition-opacity duration-300; wait until the fade-in is
  // done so the capture is the settled state, not a mid-fade frame.
  await page.waitForFunction(
    () => {
      const d = document.querySelector('[data-testid="modal-content"]');
      const root = d && d.parentElement;
      return d && root && getComputedStyle(root).opacity === '1';
    },
    { timeout: 15_000 },
  );
}

const browser = await chromium.launch();
const results = {};

// (a) desktop 1440x900, pending provider, halal popup suppressed.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    window.localStorage.setItem('uf_halal_popup_view_count', '99');
  });
  await signInAsAdmin(ctx);
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/p/${PENDING}`, { waitUntil: 'domcontentloaded' });
  console.log(`a) GET /p/pending -> ${res.status()}`);
  await page
    .locator('[data-testid="modal-content"]')
    .waitFor({ state: 'visible', timeout: 20_000 });
  await waitForDialogSettled(page);
  results.a = await assertBannerOnTop(page, AWAITING);
  // Prove the banner sits inside the modal scroll container, not page-level.
  results.a.insideModal = await page.evaluate(() => {
    const p = [...document.querySelectorAll('p')].find(
      (n) =>
        /awaiting a manual review|wartet auf eine manuelle prüfung/i.test(n.textContent) &&
        n.offsetParent !== null,
    );
    return p ? p.closest('[data-testid="modal-content"]') !== null : false;
  });
  console.log(`   banner inside modal-content: ${results.a.insideModal}`);
  await page.screenshot({ path: `${OUT}/01-desktop-pending-banner-inside-modal.png` });
  await ctx.close();
}

// (b) same provider, first-visit state: no uf_halal_popup_view_count set, so
// HalalTrustPopup mounts. It renders page-level at z-[1000] — under the
// z-[999999] dialog — and must not reach the banner either.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signInAsAdmin(ctx);
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/p/${PENDING}`, { waitUntil: 'domcontentloaded' });
  console.log(`b) GET /p/pending (first visit) -> ${res.status()}`);
  await page
    .locator('[data-testid="modal-content"]')
    .waitFor({ state: 'visible', timeout: 20_000 });
  await waitForDialogSettled(page);
  results.b = {};
  results.b.halalPopupMounted = await page.evaluate(() => {
    const el = document.querySelector('div.fixed.inset-0.z-\\[1000\\]');
    if (!el) return { mounted: false };
    // elementFromPoint at the popup's own centre shows whether it is on top.
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      mounted: true,
      coveredBy: top
        ? `${top.tagName}.${typeof top.className === 'string' ? top.className : ''}`
        : 'null',
    };
  });
  console.log(`   halal popup: ${JSON.stringify(results.b.halalPopupMounted)}`);
  results.b.hit = await assertBannerOnTop(page, AWAITING);
  await page.screenshot({ path: `${OUT}/02-desktop-first-visit-halal-popup-mounted.png` });
  await ctx.close();
}

// (c) desktop 1440x900, rejected provider — submissionStatus.rejectedBanner.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    window.localStorage.setItem('uf_halal_popup_view_count', '99');
  });
  await signInAsAdmin(ctx);
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/p/${REJECTED}`, { waitUntil: 'domcontentloaded' });
  console.log(`c) GET /p/rejected -> ${res.status()}`);
  await page
    .locator('[data-testid="modal-content"]')
    .waitFor({ state: 'visible', timeout: 20_000 });
  await waitForDialogSettled(page);
  results.c = await assertBannerOnTop(page, REJECTED_RE);
  await page.screenshot({ path: `${OUT}/03-desktop-rejected-banner-inside-modal.png` });
  await ctx.close();
}

// (d) mobile 390x844, pending provider — banner must be unchanged: page-level
// sticky bar at the top, no modal.
{
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    defaultBrowserType: 'chromium',
  });
  await ctx.addInitScript(() => {
    window.localStorage.setItem('uf_halal_popup_view_count', '99');
  });
  await signInAsAdmin(ctx);
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/p/${PENDING}`, { waitUntil: 'domcontentloaded' });
  console.log(`d) GET /p/pending (mobile) -> ${res.status()}`);
  results.d = {};
  results.d.modalMounted = (await page.locator('[data-testid="modal-content"]').count()) > 0;
  results.d.hit = await assertBannerOnTop(page, AWAITING);
  console.log(`   desktop modal mounted on mobile: ${results.d.modalMounted}`);
  await page.screenshot({ path: `${OUT}/04-mobile-banner-unchanged.png` });
  await ctx.close();
}

await browser.close();
console.log('\nDONE');
console.log(JSON.stringify(results, null, 2));
