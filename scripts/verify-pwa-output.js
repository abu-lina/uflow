// Asserts the service worker was actually emitted by a production build.
// @ducanh2912/next-pwa generates public/sw.js through webpack only; a build
// that silently ran Turbopack (the Next 16 default) exits cleanly but ships
// no service worker: no push notifications, no offline fallback.
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
    'The service worker is produced via webpack (@ducanh2912/next-pwa). ' +
      'Build with `next build --webpack`; Turbopack ignores the webpack() config.',
  );
  process.exit(1);
}

if (!fs.readFileSync(swPath, 'utf8').includes('sw-push-handler.js')) {
  console.error('FAIL: public/sw.js exists but does not import sw-push-handler.js.');
  console.error('The importScripts entry from next.config.js workboxOptions was dropped.');
  process.exit(1);
}

console.log('OK: public/sw.js generated and imports sw-push-handler.js');
