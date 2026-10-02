/**
 * Request 281 diagnosis harness #7 (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Settles the "secondary defect" (RootClientLayout.tsx:253) in isolation, because the
 * SW script fetch for an update check is a browser-internal request that Playwright's
 * request events do not surface, so it cannot be measured against production.
 *
 * Minimal local fixture: a static server whose /sw.js body can be bumped between
 * "deploys", plus a page that reproduces the app's registration call sites:
 *
 *   arm 'guarded'       = ONLY RootClientLayout's  getRegistrations().then(rs => rs.length === 0 && register())
 *   arm 'unconditional' = ONLY next-pwa's injected register() (chunk 8928, runs every load)
 *   arm 'both'          = what production actually ships
 *
 * For each arm: load with sw.js@v1, wait for activation, bump the server to v2, reload,
 * and report which version is active. If the client stays on v1 the guard strands it.
 *
 * Note: the app's real localhost/127.0.0.1 hostname gate is intentionally omitted here;
 * it is irrelevant to the update-check question and SWs need a secure context.
 *
 * Usage: node agent-output/debug/281/sw-update-fixture.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const candidates = [process.env.PLAYWRIGHT_FROM, process.cwd(), '/Users/NARAFIQ/Projects/uflow'].filter(Boolean);
let chromium;
for (const base of candidates) {
  try { chromium = createRequire(path.join(base, 'noop.js'))('@playwright/test').chromium; break; } catch {}
}
if (!chromium) throw new Error('could not resolve @playwright/test');

const OUT = '/tmp/sw281-artifacts/fixture';
fs.mkdirSync(OUT, { recursive: true });

let SW_VERSION = 'v1';
let ARM = 'both';

const PAGE = () => `<!doctype html><meta charset=utf-8><title>281 fixture</title>
<body><h1>281 fixture</h1><p id=out>booting</p>
<script>
const ARM = ${JSON.stringify(ARM)};
// arm 'none': register once via ?bootstrap=1, then never call register() again. Isolates
// the browser's own "soft update" check that a navigation inside the SW scope performs.
if (ARM === 'none' && location.search.includes('bootstrap')) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(() => console.log('[fixture] bootstrap register resolved'));
}
// (1) next-pwa's injected call site: chunk 8928 does this at module eval, every load,
//     with no "is something already registered" check.
if (ARM === 'unconditional' || ARM === 'both') {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(() => console.log('[fixture] unconditional register resolved'));
}
// (2) RootClientLayout.tsx:250-265 call site: only registers when nothing is registered.
if (ARM === 'guarded' || ARM === 'both') {
  navigator.serviceWorker.getRegistrations().then((rs) => {
    console.log('[fixture] guarded path saw ' + rs.length + ' registration(s)');
    if (rs.length === 0) {
      navigator.serviceWorker.register('/sw.js').then(() => console.log('[fixture] guarded register resolved'));
    }
  });
}
</script></body>`;

const server = http.createServer((req, res) => {
  if (req.url === '/sw.js') {
    res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-cache, no-store, must-revalidate' });
    // Body differs per version, which is what triggers the browser's byte-compare update.
    res.end(
      `// SW_BUILD=${SW_VERSION}\n` +
        `self.SW_BUILD='${SW_VERSION}';\n` +
        `self.addEventListener('install', () => self.skipWaiting());\n` +
        `self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));\n` +
        `self.addEventListener('message', (e) => { if (e.data === 'which' && e.ports && e.ports[0]) e.ports[0].postMessage(self.SW_BUILD); });\n`
    );
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
  res.end(PAGE());
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const ORIGIN = `http://127.0.0.1:${PORT}`;
console.log(`fixture server on ${ORIGIN}`);

const out = [];
const say = (...a) => { out.push(a.join(' ')); console.log(a.join(' ')); };

const activeBuild = (page) =>
  page.evaluate(async () => {
    const rs = await navigator.serviceWorker.getRegistrations();
    if (!rs.length) return '(no registration)';
    // The served body always reflects the CURRENT server version, so ask the worker itself.
    const sw = rs[0].active;
    if (!sw) return '(no active)';
    return await new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data);
      sw.postMessage('which', [ch.port2]);
      setTimeout(() => resolve('(no reply)'), 3000);
    });
  });

for (const arm of ['none', 'guarded', 'unconditional', 'both']) {
  ARM = arm;
  SW_VERSION = 'v1';
  const profile = `/tmp/sw281-fixture-${arm}`;
  fs.rmSync(profile, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(profile, { headless: true, serviceWorkers: 'allow' });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.on('console', (m) => { if (m.text().startsWith('[fixture]')) say(`   ${m.text()}`); });

  say(`\n--- arm: ${arm} ---`);
  await page.goto(ORIGIN + (arm === 'none' ? '/?bootstrap=1' : '/'));
  await page.waitForTimeout(2500);
  const before = await activeBuild(page);
  say(`   active SW build after first load (server serving v1): ${before}`);

  SW_VERSION = 'v2'; // "deploy" a new sw.js
  await page.goto(ORIGIN + '/'); // plain navigation, no ?bootstrap
  await page.waitForTimeout(3000);
  const after = await activeBuild(page);
  say(`   active SW build after reload  (server serving v2): ${after}`);
  say(`   => picked up the new sw.js? ${after === 'v2' ? 'YES' : 'NO  <-- stranded on ' + after}`);
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'fixture.txt'), out.join('\n'));
say(`\nArtifacts: ${OUT}`);
server.close();
