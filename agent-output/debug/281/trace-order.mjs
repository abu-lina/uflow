/**
 * Request 281 diagnosis harness #2 (THROWAWAY DEBUG SCRIPT - not part of the app).
 *
 * Wraps navigator.serviceWorker.{register,getRegistrations} and
 * ServiceWorkerRegistration.prototype.unregister with timestamped [DEBUG-a4f2] logs
 * via an init script, so the ordering of the three competing call sites is observable:
 *   1. next-pwa's injected  window.workbox.register()           (module eval)
 *   2. cleanupServiceWorkers()                                   (ClientProviders effect)
 *   3. ServiceWorkerRegistration()                               (RootClientLayout effect)
 * Also records time from first paint to the forced reload.
 *
 * Usage: node agent-output/debug/281/trace-order.mjs [--sessions=2] [--fresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const candidates = [process.env.PLAYWRIGHT_FROM, process.cwd(), '/Users/NARAFIQ/Projects/uflow'].filter(Boolean);
let chromium;
for (const base of candidates) {
  try {
    chromium = createRequire(path.join(base, 'noop.js'))('@playwright/test').chromium;
    break;
  } catch {}
}
if (!chromium) throw new Error('could not resolve @playwright/test');

const args = process.argv.slice(2);
const arg = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const URL_ = arg('url', 'https://ummahflow.com');
const SESSIONS = Number(arg('sessions', '2'));
const PROFILE = arg('profile', '/tmp/sw281-profile-trace');
const OUT = arg('out', '/tmp/sw281-artifacts/trace');
if (args.includes('--fresh')) fs.rmSync(PROFILE, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const INIT = `(() => {
  const T0 = performance.now();
  const t = () => '+' + performance.now().toFixed(1) + 'ms';
  const stack = () => (new Error().stack || '').split('\\n').slice(2, 5).join(' | ');
  const log = (...a) => console.log('[DEBUG-a4f2]', t(), ...a);
  log('init-script ran, navigationType=', performance.getEntriesByType('navigation')[0] && performance.getEntriesByType('navigation')[0].type);
  if (!('serviceWorker' in navigator)) return;
  const c = navigator.serviceWorker;
  const origReg = c.register.bind(c);
  const origGet = c.getRegistrations.bind(c);
  c.register = function (...a) {
    log('register(' + JSON.stringify(a[0]) + ') CALLED  @', stack());
    return origReg(...a).then((r) => { log('register RESOLVED'); return r; },
                              (e) => { log('register REJECTED', e && e.message); throw e; });
  };
  let n = 0;
  c.getRegistrations = function (...a) {
    const id = ++n;
    log('getRegistrations#' + id + ' CALLED  @', stack());
    return origGet(...a).then((rs) => { log('getRegistrations#' + id + ' RESOLVED length=' + rs.length); return rs; });
  };
  const SWR = window.ServiceWorkerRegistration;
  if (SWR && SWR.prototype.unregister) {
    const origUn = SWR.prototype.unregister;
    SWR.prototype.unregister = function () { log('unregister() CALLED on', this.scope); return origUn.call(this); };
  }
  if (window.caches) {
    const origDel = caches.delete.bind(caches);
    caches.delete = (k) => { log('caches.delete(' + k + ')'); return origDel(k); };
  }
  const origReload = location.reload.bind(location);
  Object.defineProperty(location, 'reload', { configurable: true, value: function () {
    log('!!! location.reload() CALLED !!!');
    return origReload();
  }});
})();`;

const out = [];
const say = (...a) => { out.push(a.join(' ')); console.log(a.join(' ')); };

for (let s = 1; s <= SESSIONS; s++) {
  say(`\n============ TRACE SESSION ${s} ============`);
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true, serviceWorkers: 'allow' });
  await ctx.addInitScript(INIT);
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.on('console', (m) => {
    const txt = m.text();
    if (/DEBUG-a4f2|SW Cleanup|Service Worker/i.test(txt)) say('   ' + txt);
  });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) say('   >>> mainframe navigated: ' + f.url()); });

  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: 'load', timeout: 60_000 });
  say(`   [load event at +${Date.now() - t0}ms]`);
  await page.waitForTimeout(12_000);
  await page.screenshot({ path: path.join(OUT, `trace-session-${s}.png`) });
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, 'trace.txt'), out.join('\n'));
say(`\nArtifacts: ${OUT}`);
