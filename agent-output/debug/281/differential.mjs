/**
 * Request 281 diagnosis harness #5 (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Differential loop. One variable changed: whether sessionStorage['sw-cleaned-up'] is
 * already set when the page boots. Setting it makes cleanupServiceWorkers() return early
 * at serviceWorkerCleanup.ts:17 without touching the app bundle, which isolates the
 * cleanup as the cause of the reload + cache wipe.
 *
 *   arm A (control):  flag NOT pre-set  -> cleanup runs
 *   arm B (treatment): flag pre-set     -> cleanup no-ops
 *
 * Also counts network requests / transferred bytes per arm to price the cache wipe.
 *
 * Usage: node agent-output/debug/281/differential.mjs
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
const OUT = '/tmp/sw281-artifacts/diff';
fs.mkdirSync(OUT, { recursive: true });

const probe = () =>
  Promise.all([
    navigator.serviceWorker.getRegistrations().then((rs) => rs.map((r) => r.active?.scriptURL ?? '(no active)')),
    'caches' in window ? caches.keys() : Promise.resolve([]),
  ]).then(([regs, cacheKeys]) => ({
    regs,
    cacheKeys: cacheKeys.sort(),
    flag: sessionStorage.getItem('sw-cleaned-up'),
    navType: performance.getEntriesByType('navigation')[0]?.type ?? null,
  }));

const out = [];
const say = (...a) => { out.push(a.join(' ')); console.log(a.join(' ')); };

async function run(arm, profile, preSeedFlag) {
  const ctx = await chromium.launchPersistentContext(profile, { headless: true, serviceWorkers: 'allow' });
  if (preSeedFlag) {
    await ctx.addInitScript(`try { sessionStorage.setItem('sw-cleaned-up', 'true'); } catch (e) {}`);
  }
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  let cleanupRan = false;
  let reloadLogged = false;
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('[SW Cleanup] Starting')) cleanupRan = true;
    if (t.includes('[SW Cleanup] Reloading')) reloadLogged = true;
  });
  const reqs = [];
  page.on('requestfinished', async (r) => {
    try {
      const s = await r.sizes();
      reqs.push({ url: r.url(), bytes: s.responseBodySize + s.responseHeadersSize });
    } catch {}
  });
  const loads = [];
  const t0 = Date.now();
  page.on('load', () => loads.push(Date.now() - t0));

  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(14_000);
  const st = await page.evaluate(probe);
  const bytes = reqs.reduce((a, r) => a + r.bytes, 0);
  say(`\n[${arm}]`);
  say(`   cleanupBodyRan=${cleanupRan}  reloadLogged=${reloadLogged}  loadEvents=[${loads.join(',')}]  navType=${st.navType}`);
  say(`   registrations=${JSON.stringify(st.regs)}`);
  say(`   caches=${JSON.stringify(st.cacheKeys)}`);
  say(`   requests=${reqs.length}  transferred=${(bytes / 1024).toFixed(0)}KB`);
  await ctx.close();
  return { arm, cleanupRan, reloadLogged, loads, st, requests: reqs.length, bytesKB: +(bytes / 1024).toFixed(0) };
}

const results = [];
// Arm A: warm one profile, then re-open it (session boundary) with cleanup ALLOWED to run.
const pA = '/tmp/sw281-profile-diffA';
fs.rmSync(pA, { recursive: true, force: true });
await run('A warmup (fresh profile)', pA, false);
results.push(await run('A session-2 CONTROL: cleanup allowed', pA, false));
results.push(await run('A session-3 CONTROL: cleanup allowed', pA, false));

// Arm B: same procedure, but the flag is pre-set so the cleanup body never runs.
const pB = '/tmp/sw281-profile-diffB';
fs.rmSync(pB, { recursive: true, force: true });
await run('B warmup (fresh profile)', pB, true);
results.push(await run('B session-2 TREATMENT: cleanup no-op', pB, true));
results.push(await run('B session-3 TREATMENT: cleanup no-op', pB, true));

say('\n================ VERDICT ================');
for (const r of results) {
  say(
    `${r.arm.padEnd(40)} reload=${String(r.reloadLogged).padEnd(5)} loads=${r.loads.length} caches=${r.st.cacheKeys.length} regs=${r.st.regs.length} reqs=${r.requests} ${r.bytesKB}KB`
  );
}
fs.writeFileSync(path.join(OUT, 'differential.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, 'differential.txt'), out.join('\n'));
say(`\nArtifacts: ${OUT}`);
