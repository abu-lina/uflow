/**
 * Request 281 diagnosis harness #3 (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Measures the user-visible severity of the forced reload: how long after
 * first-contentful-paint does location.reload() fire, and was the page painted
 * (DOM node count / visible text) at that moment.
 *
 * Usage: node agent-output/debug/281/measure-reload.mjs [--runs=6]
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

const args = process.argv.slice(2);
const arg = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const URL_ = arg('url', 'https://ummahflow.com');
const RUNS = Number(arg('runs', '6'));
const PROFILE = arg('profile', '/tmp/sw281-profile-measure');
const OUT = arg('out', '/tmp/sw281-artifacts/measure');
fs.rmSync(PROFILE, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// NOTE: location.reload is [LegacyUnforgeable] in Chrome, so it CANNOT be monkeypatched
// (defineProperty throws). Instead hook console.log and snapshot synchronously when the
// cleanup prints its "Reloading page..." line, which is the statement immediately before
// window.location.reload().
const INIT = `(() => {
  const orig = console.log.bind(console);
  console.log = function (...a) {
    try {
      if (typeof a[0] === 'string' && a[0].indexOf('Reloading page to apply changes') !== -1) {
        const fcpE = performance.getEntriesByName('first-contentful-paint')[0];
        const fcp = fcpE ? fcpE.startTime : null;
        const snap = {
          tReloadMs: +performance.now().toFixed(1),
          fcpMs: fcp === null ? null : +fcp.toFixed(1),
          msAfterFcp: fcp === null ? null : +(performance.now() - fcp).toFixed(1),
          navType: (performance.getEntriesByType('navigation')[0] || {}).type,
          domNodes: document.querySelectorAll('*').length,
          visibleTextLen: ((document.body && document.body.innerText) || '').trim().length,
          textHead: ((document.body && document.body.innerText) || '').trim().slice(0, 140).replace(/\\s+/g, ' '),
        };
        orig('[DEBUG-a4f2-SNAP] ' + JSON.stringify(snap));
      }
    } catch (e) { orig('[DEBUG-a4f2-SNAP-ERR] ' + e.message); }
    return orig(...a);
  };
})();`;

const results = [];
const out = [];
const say = (...a) => { out.push(a.join(' ')); console.log(a.join(' ')); };

for (let r = 1; r <= RUNS; r++) {
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true, serviceWorkers: 'allow' });
  await ctx.addInitScript(INIT);
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  let snap = null;
  let shot = false;
  const loads = [];
  page.on('console', async (m) => {
    const t = m.text();
    if (t.startsWith('[DEBUG-a4f2-SNAP-ERR]')) say(`   ${t}`);
    if (t.startsWith('[DEBUG-a4f2-SNAP]')) {
      snap = JSON.parse(t.replace('[DEBUG-a4f2-SNAP] ', ''));
      if (!shot) { shot = true; page.screenshot({ path: path.join(OUT, `run-${r}-at-reload.png`) }).catch(() => {}); }
    }
  });
  const t0 = Date.now();
  page.on('load', () => loads.push(Date.now() - t0));
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(15_000);
  const finalNavType = await page.evaluate(
    () => (performance.getEntriesByType('navigation')[0] || {}).type
  );
  say(`run ${r}: loadEvents=[${loads.join(',')}] finalNavType=${finalNavType} ${snap ? JSON.stringify(snap) : 'NO RELOAD SNAPSHOT'}`);
  results.push({ run: r, snap, loads, finalNavType });
  await ctx.close();
}

const reloads = results.filter((r) => r.snap);
say(`\nforced reloads: ${reloads.length}/${RUNS} sessions`);
if (reloads.length) {
  const after = reloads.map((r) => r.snap.msAfterFcp).filter((v) => v !== null);
  say(`ms after first-contentful-paint: min=${Math.min(...after)} max=${Math.max(...after)} values=${after.join(', ')}`);
  say(`dom nodes at reload: ${reloads.map((r) => r.snap.domNodes).join(', ')}`);
  say(`visible text length at reload: ${reloads.map((r) => r.snap.visibleTextLen).join(', ')}`);
}
fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, 'measure.txt'), out.join('\n'));
say(`Artifacts: ${OUT}`);
