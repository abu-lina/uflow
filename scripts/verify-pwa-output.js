// Asserts the service worker was actually emitted by a production build, and
// that it still carries the push-notification logic.
//
// The worker is built by `serwist build` (@serwist/cli, see serwist.config.mjs)
// as a step after `next build`, not by a bundler plugin, so a build that drops
// the step exits cleanly and ships no service worker: no push notifications, no
// offline fallback. That is what assertion 1 catches.
//
// Assertion 2 used to look for the literal `sw-push-handler.js`, because
// @ducanh2912/next-pwa injected `importScripts('/sw-push-handler.js')` and the
// filename appeared verbatim. Serwist bundles with esbuild, which inlines
// src/lib/pwa/sw-push-handler.js, so the filename is gone and only the behaviour
// remains. The assertion now matches that behaviour instead — same intent, same
// failure on a dropped import, no filename to go stale.
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

if (process.env.DISABLE_PWA === 'true') {
  console.log('DISABLE_PWA=true: skipping service worker verification.');
  process.exit(0);
}

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('FAIL: public/sw.js was not generated.');
  console.error(
    'The service worker is produced by `serwist build` (scripts/build-sw.js). ' +
      'Run it after `next build`; `next build` alone emits no worker.',
  );
  process.exit(1);
}

const sw = fs.readFileSync(swPath, 'utf8');

// Three markers from src/lib/pwa/sw-push-handler.js, all verified present in a
// real minified esbuild bundle. esbuild normalises string literals to double
// quotes, hence `addEventListener("push"` rather than the source's single quotes.
const pushHandlerMarkers = [
  'addEventListener("push"',
  'showNotification',
  'UFLOW', // the default notification title
];

const missing = pushHandlerMarkers.filter((marker) => !sw.includes(marker));

if (missing.length > 0) {
  console.error('FAIL: public/sw.js exists but the push handler was not bundled into it.');
  console.error(`Missing marker(s): ${missing.map((m) => JSON.stringify(m)).join(', ')}`);
  console.error(
    "Check that src/lib/pwa/sw.ts still does `import './sw-push-handler';` and that " +
      'src/lib/pwa/sw-push-handler.js still registers a push listener that calls ' +
      'self.registration.showNotification.',
  );
  process.exit(1);
}

console.log('OK: public/sw.js generated and the push handler is bundled into it');
console.log(`     markers found: ${pushHandlerMarkers.map((m) => JSON.stringify(m)).join(', ')}`);
