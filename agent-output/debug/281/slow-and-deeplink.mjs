/**
 * Request 281 diagnosis harness #4 (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Two questions:
 *  a) Under a slow mobile connection, how long after first-contentful-paint does the
 *     forced reload land? (Severity: flash during load vs yank after interactive.)
 *  b) Does the cleanup fire when the session's FIRST page is a deep link rather than '/'?
 *     (ClientProviders is in the root layout, so it should; confirm empirically.)
 *
 * Read-only: GETs public pages only.
 * Usage: node agent-output/debug/281/slow-and-deeplink.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const candidates = [process.env.PLAYWRIGHT_FROM, process.cwd(), '/Users/NARAFIQ/Projects/uflow'].filter(Boolean);
let chromium;
for (const base of candidates) {
  try { chromium = createRequire(path.join(base, 'noop.js'))('@playwright/test').chromium; break; } catch {}
}
if (!chromium) throw new Error('could not resolve @playwright/test');

const ORIGIN = 'https://ummahflow.com';
const OUT = '/tmp/sw281-artifacts/slow';
const PROFILE = '/tmp/sw281-profile-slow';
fs.rmSync(PROFILE, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const INIT = `(() => {
  const orig = console.log.bind(console);
  console.log = function (...a) {
    try {
      if (typeof a[0] === 'string' && a[0].indexOf('Reloading page to apply changes') !== -1) {
        const fcpE = performance.getEntriesByName('first-contentful-paint')[0];
        const fcp = fcpE ? fcpE.startTime : null;
        orig('[DEBUG-a4f2-SNAP] ' + JSON.stringify({
          url: location.pathname,
          tReloadMs: +performance.now().toFixed(1),
          fcpMs: fcp === null ? null : +fcp.toFixed(1),
          msAfterFcp: fcp === null ? null : +(performance.now() - fcp).toFixed(1),
          domNodes: document.querySelectorAll('*').length,
          visibleTextLen: ((document.body && document.body.innerText) || '').trim().length,
        }));
      }
    } catch (e) {}
    return orig(...a);
  };
})();`;

const out = [];
const say = (...a) => { out.push(a.join(' ')); console.log(a.join(' ')); };

// 'Fast 4G'-ish and 'Slow 3G'-ish presets (DevTools values).
const NET = {
  none: null,
  slow3g: { offline: false, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, latency: 400 },
};

async function session(label, entryPath, throttle, warm) {
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true, serviceWorkers: 'allow' });
  await ctx.addInitScript(INIT);
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  let snap = null;
  page.on('console', (m) => {
    const t = m.text();
    if (t.startsWith('[DEBUG-a4f2-SNAP]')) snap = JSON.parse(t.replace('[DEBUG-a4f2-SNAP] ', ''));
    if (t.includes('[SW Cleanup]')) say(`   console> ${t}`);
  });
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', throttle);
  }
  const t0 = Date.now();
  const loads = [];
  page.on('load', () => loads.push(Date.now() - t0));
  say(`\n--- ${label} (entry=${entryPath}, throttle=${throttle ? 'slow3g' : 'none'}) ---`);
  await page.goto(ORIGIN + entryPath, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(throttle ? 40_000 : 15_000);
  const nav = await page.evaluate(() => ({
    type: (performance.getEntriesByType('navigation')[0] || {}).type,
    path: location.pathname,
  }));
  say(`   loadEvents=[${loads.join(',')}] finalNavType=${nav.type} finalPath=${nav.path}`);
  say(`   reloadSnapshot=${snap ? JSON.stringify(snap) : 'none'}`);
  await page.screenshot({ path: path.join(OUT, `${label}.png`) });
  await ctx.close();
  return { label, entryPath, snap, loads, nav };
}

const results = [];
// Warm the profile so a registration exists, then test the session boundary behaviour.
results.push(await session('1-warmup-home', '/', NET.none));
results.push(await session('2-session2-home-slow3g', '/', NET.slow3g));
results.push(await session('3-session3-deeplink-about', '/about', NET.none));
results.push(await session('4-session4-deeplink-food', '/food', NET.none));

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, 'results.txt'), out.join('\n'));
say(`\nArtifacts: ${OUT}`);
