// Build guard: the shipped service worker must NOT intercept Iconify CDN requests.
//
// This is THE acceptance criterion for the constraint that two post-mortems were
// written about (analysis 046, retrospective 064/069). Registering any route that
// matches api.iconify.design / api.unisvg.com / api.simplesvg.com makes Serwist
// call `event.respondWith()` and re-issue the request from the service-worker
// context, which is what stopped icons loading on /p/[id]. With no matching route
// Serwist never calls respondWith and the browser handles those requests natively
// (serwist/src/Serwist.ts, `handleFetch` / `handleRequest`).
//
// It asserts that property on the artifact, not on the source: the built
// public/sw.js is executed under node:vm with stubbed service-worker globals, the
// `fetch` listener Serwist registers is captured, and a fake FetchEvent is
// dispatched for each Iconify origin with `respondWith` as a spy.
//
// Why not grep the bundle: every grepable marker (`cacheName:"cross-origin"`,
// `matcher:/.*\/i`, the property name `matcher` itself) depends on esbuild's
// current minifier output shape, and `mangleProps` is a supported esbuildOptions
// key. A guard that can silently stop guarding is worse than no guard. This one
// throws if the stubs ever become insufficient, so it fails loud instead.
//
// Why not a Playwright Firefox ETP spec: the three Iconify domains appear on none
// of the lists Firefox ETP classifies by (0 matches in Disconnect's services.json,
// EasyPrivacy and EasyList), and a Firefox 155 reproduction returned 200 with ETP
// both on and off. Such a spec would pass whether or not the bug was present.
//
// Ported from agent-output/research/282-sandbox-probe.reference.mjs, which was
// validated against three real builds (hand-ported / defaultCache /
// explicit-Iconify-route) and separated them cleanly.
//
// See: agent-output/analysis/closed/046-iconify-pwa-analysis.md
//      agent-output/retrospectives/closed/064-iconify-sw-cors-fix-retrospective.md
//      agent-output/research/282-defaultcache-iconify.md

/* global console, URL, Request, Response, Headers, setTimeout, clearTimeout */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';
import vm from 'node:vm';

const repoRoot = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const swPath = path.join(repoRoot, 'public', 'sw.js');

// Matches scripts/verify-pwa-output.js: with the PWA disabled there is no worker
// to inspect and nothing to assert.
if (process.env.DISABLE_PWA === 'true') {
  console.log('DISABLE_PWA=true: skipping cross-origin interception check.');
  process.exit(0);
}

if (!fs.existsSync(swPath)) {
  console.error('FAIL: public/sw.js was not generated, so it cannot be checked.');
  process.exit(1);
}

const ORIGIN = 'https://ummahflow.com';

const CROSS_ORIGIN_URLS = [
  'https://api.iconify.design/lucide.json?icons=share-2',
  'https://api.unisvg.com/mdi.json?icons=instagram',
  'https://api.simplesvg.com/entypo.json?icons=old-phone',
];

const swSource = fs.readFileSync(swPath, 'utf8');

/**
 * Evaluates the built worker in a sandbox and returns the listeners it registered.
 * Throws if evaluation fails, which is deliberate: a worker this script cannot
 * load must fail the build rather than silently assert nothing.
 */
function runWorker() {
  const listeners = new Map();
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    registration: {
      scope: `${ORIGIN}/`,
      navigationPreload: { enable() {}, disable() {} },
      showNotification: async () => {},
    },
    clients: { claim() {}, matchAll: async () => [], openWindow: async () => null },
    skipWaiting() {},
    importScripts() {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    caches: {
      open: async () => ({
        match: async () => undefined,
        put: async () => {},
        keys: async () => [],
      }),
      keys: async () => [],
      match: async () => undefined,
      delete: async () => false,
    },
    fetch: async () => new Response('{}', { status: 200 }),
  };
  self.self = self;
  const sandbox = {
    self,
    location: self.location,
    registration: self.registration,
    clients: self.clients,
    caches: self.caches,
    fetch: self.fetch,
    URL,
    Request,
    Response,
    Headers,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    indexedDB: undefined,
    ServiceWorkerGlobalScope: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(swSource, sandbox, { filename: swPath });
  return listeners;
}

const listeners = runWorker();
const fetchListeners = listeners.get('fetch') ?? [];

// Positive control. If the worker registered no fetch listener at all, every
// "not intercepted" result below would be true for the wrong reason and this
// guard would pass vacuously.
if (fetchListeners.length === 0) {
  console.error('FAIL: public/sw.js registered no fetch listener.');
  console.error(
    'Either the worker is not a Serwist worker or `addEventListeners()` was ' +
      'dropped from src/lib/pwa/sw.ts. Nothing can be asserted about ' +
      'interception until it does.',
  );
  process.exit(1);
}

/** Dispatches a fake FetchEvent and reports whether respondWith was called. */
function intercepts(requestUrl) {
  let responded = false;
  const event = {
    request: new Request(requestUrl, { method: 'GET' }),
    respondWith(promise) {
      responded = true;
      // The handler is never awaited; swallow its rejection so an unhandled
      // rejection cannot take the process down and mask the real result.
      Promise.resolve(promise).catch(() => {});
    },
    waitUntil(promise) {
      Promise.resolve(promise).catch(() => {});
    },
    preloadResponse: Promise.resolve(undefined),
  };
  for (const fn of fetchListeners) fn(event);
  return responded;
}

// Positive control, part two. "No route matched" and "the routing table was
// never populated" produce identical results, so prove the router actually
// routes: /offline.html is precached via the `public/**/*` glob, which
// serwist.config.mjs's manifestTransforms rewrites to `/offline.html`, so the
// PrecacheRoute must intercept it.
const CONTROL_URL = `${ORIGIN}/offline.html`;
if (!intercepts(CONTROL_URL)) {
  console.error(`FAIL: public/sw.js did not intercept the control URL ${CONTROL_URL}.`);
  console.error(
    swSource.includes('"/offline.html"')
      ? 'The precache manifest contains /offline.html but no route served it, so the ' +
          'routing table is not being exercised and the Iconify assertions below ' +
          'would pass vacuously.'
      : 'The precache manifest does not contain /offline.html. Check that ' +
          'public/offline.html exists and is not caught by globIgnores in serwist.config.mjs.',
  );
  process.exit(1);
}

console.log(`  (control) ${CONTROL_URL} INTERCEPTED, as it must be`);

const intercepted = CROSS_ORIGIN_URLS.filter((requestUrl) => intercepts(requestUrl));

for (const requestUrl of CROSS_ORIGIN_URLS) {
  const host = new URL(requestUrl).host;
  const verdict = intercepted.includes(requestUrl) ? 'INTERCEPTED' : 'not intercepted';
  console.log(`  ${host.padEnd(22)} ${verdict}`);
}

if (intercepted.length > 0) {
  console.error('');
  console.error('FAIL: public/sw.js intercepts cross-origin Iconify CDN requests.');
  console.error(`Intercepted: ${intercepted.join(', ')}`);
  console.error('');
  console.error('A route in src/lib/pwa/runtimeCaching.ts matches these origins.');
  console.error('The usual causes, in order of likelihood:');
  console.error('  1. `defaultCache` from @serwist/next/worker was imported. Do not.');
  console.error('     Its entry 19 is `({ sameOrigin }) => !sameOrigin` -> NetworkFirst');
  console.error('     "cross-origin" and its entry 20 is a dot-star NetworkOnly catch-all.');
  console.error('  2. An explicit route for the Iconify domains was added "as a safety net".');
  console.error('     That was tried in release v0.9.9 and made things worse.');
  console.error('  3. A matcher lost its `^` anchor, or a `!sameOrigin` matcher was added.');
  console.error('');
  console.error('See agent-output/research/282-defaultcache-iconify.md.');
  process.exit(1);
}

console.log(
  `OK: public/sw.js registers no route matching the Iconify CDN origins ` +
    `(${fetchListeners.length} fetch listener(s) inspected)`,
);
