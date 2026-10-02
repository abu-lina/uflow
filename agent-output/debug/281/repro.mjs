/**
 * Request 281 diagnosis harness (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Drives a real Chromium against a target origin using a PERSISTENT profile so that
 * service-worker registrations, caches and localStorage survive across runs, while
 * sessionStorage is reset on every context open. Closing + reopening the persistent
 * context is exactly the "new browser session" condition that gates
 * cleanupServiceWorkers() via sessionStorage['sw-cleaned-up'].
 *
 * Usage:
 *   node agent-output/debug/281/repro.mjs [--url=https://ummahflow.com] [--sessions=3] [--fresh]
 *
 * Read-only against the target: loads '/' only, no logins, no form posts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// This worktree has no node_modules; resolve playwright from wherever it is installed.
// Override with PLAYWRIGHT_FROM=/abs/path/to/a/repo/with/node_modules
const candidates = [
  process.env.PLAYWRIGHT_FROM,
  process.cwd(),
  '/Users/NARAFIQ/Projects/uflow',
].filter(Boolean);
let chromium;
for (const base of candidates) {
  try {
    chromium = createRequire(path.join(base, 'noop.js'))('@playwright/test').chromium;
    console.log(`[harness] playwright resolved from ${base}`);
    break;
  } catch {}
}
if (!chromium) throw new Error('could not resolve @playwright/test');

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
};
const URL_ = arg('url', 'https://ummahflow.com');
const SESSIONS = Number(arg('sessions', '3'));
const PROFILE = arg('profile', '/tmp/sw281-profile');
const OUT = arg('out', '/tmp/sw281-artifacts');

if (args.includes('--fresh')) fs.rmSync(PROFILE, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const probe = () =>
  Promise.all([
    navigator.serviceWorker.getRegistrations().then((rs) =>
      rs.map((r) => ({
        scope: r.scope,
        active: r.active?.scriptURL ?? null,
        activeState: r.active?.state ?? null,
        installing: r.installing?.scriptURL ?? null,
        waiting: r.waiting?.scriptURL ?? null,
      }))
    ),
    'caches' in window ? caches.keys() : Promise.resolve(['<no caches api>']),
  ]).then(([regs, cacheKeys]) => ({
    regs,
    cacheKeys,
    swCleanedUpFlag: sessionStorage.getItem('sw-cleaned-up'),
    navType: performance.getEntriesByType('navigation')[0]?.type ?? null,
    controller: navigator.serviceWorker.controller?.scriptURL ?? null,
  }));

const log = [];
const say = (...a) => {
  const line = a.join(' ');
  log.push(line);
  console.log(line);
};

for (let s = 1; s <= SESSIONS; s++) {
  say(`\n================ SESSION ${s} (${URL_}) ================`);
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: true,
    serviceWorkers: 'allow',
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const consoleLines = [];
  const navs = [];
  page.on('console', (m) => {
    const t = m.text();
    consoleLines.push(`[${m.type()}] ${t}`);
    if (/SW Cleanup|Service Worker/i.test(t)) say(`   console> ${t}`);
  });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) {
      navs.push({ url: f.url(), at: Date.now() });
      say(`   nav#${navs.length}> ${f.url()}`);
    }
  });
  ctx.on('serviceworker', (w) => say(`   sw-created> ${w.url()}`));

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Let both mount effects, the forced reload (if any) and SW install settle.
  await page.waitForTimeout(12_000);

  let after;
  try {
    after = await page.evaluate(probe);
  } catch (e) {
    // A reload mid-evaluate destroys the execution context; retry once.
    await page.waitForTimeout(3000);
    after = await page.evaluate(probe);
  }

  say(`   mainFrameNavigations = ${navs.length}  (>1 means a forced reload happened)`);
  say(`   navigationType       = ${after.navType}`);
  say(`   sessionStorage flag  = ${after.swCleanedUpFlag}`);
  say(`   registrations        = ${JSON.stringify(after.regs)}`);
  say(`   controller           = ${after.controller}`);
  say(`   caches (${after.cacheKeys.length})        = ${JSON.stringify(after.cacheKeys)}`);

  fs.writeFileSync(
    path.join(OUT, `session-${s}-console.txt`),
    consoleLines.join('\n') + '\n\n--- navigations ---\n' + JSON.stringify(navs, null, 2)
  );
  fs.writeFileSync(path.join(OUT, `session-${s}-state.json`), JSON.stringify(after, null, 2));
  await page.screenshot({ path: path.join(OUT, `session-${s}.png`), fullPage: false });

  await ctx.close(); // <-- session boundary: sessionStorage dies, SW + caches persist on disk
}

fs.writeFileSync(path.join(OUT, 'summary.txt'), log.join('\n'));
say(`\nArtifacts: ${OUT}`);
