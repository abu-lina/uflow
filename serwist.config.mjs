// @serwist/next in "configurator mode": this file is a @serwist/cli config, not
// a Next.js plugin. `serwist build` reads it AFTER `next build` has written
// .next/, bundles src/lib/pwa/sw.ts with esbuild and injects the precache
// manifest. Nothing is injected into the client bundle, so the app registers the
// worker itself (src/components/layout/RootClientLayout.tsx).
//
// Run it through `node scripts/build-sw.js`, never directly: that wrapper is the
// only thing honouring DISABLE_PWA (configurator mode has no `disable` option).
//
// .mjs, not .js: `@serwist/next/config` is ESM-only and this package is CommonJS,
// so a `serwist.config.js` here would be CJS and could only reach it through
// `require(esm)`. `scripts/build-sw.js` passes this filename to the CLI
// explicitly, since the CLI's default is `serwist.config.js`.
//
// See agent-output/_archive/research/282-defaultcache-iconify.md for the option-by-option
// mapping from the old `withPWA({...})` call.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { serwist } from '@serwist/next/config';

// Works around a real defect in @serwist/next@9.5.12's injected
// manifestTransforms, found by scripts/verify-sw-no-cross-origin-routes.mjs's
// positive control.
//
// That transform strips `.html` off EVERY manifest entry, to turn
// `.next/server/app/foo.html` into the route `/foo`. Correct for a prerendered
// page, wrong for a literal static file: it runs before the `public/` prefix
// strip, so `public/offline.html` comes out as `/public/offline` and
// `public/clear-storage.html` as `/public/clear-storage`. Both 404.
//
// That is not cosmetic. Serwist rejects the install event if any precache entry
// fails to fetch, so two bogus URLs mean the worker never installs, never
// activates, and `fallbacks: { entries: [{ url: '/offline.html' }] }` in
// src/lib/pwa/sw.ts points at something that was never cached.
//
// Fix: keep public/**/*.html out of the glob (see globIgnores below) and add the
// same files back through `additionalPrecacheEntries`, which the transform
// leaves alone, with their real served URLs.
const publicDir = 'public';
const publicHtmlPrecacheEntries = fs
  .readdirSync(publicDir, { recursive: true, encoding: 'utf8' })
  .filter((entry) => entry.endsWith('.html'))
  .map((entry) => ({
    url: `/${entry.split(path.sep).join('/')}`,
    // Content hash, so a changed page produces a new precache revision. Not a
    // security boundary; it is the same role as Workbox's file revisions.
    revision: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(publicDir, entry)))
      .digest('hex'),
  }));

export default serwist({
  additionalPrecacheEntries: publicHtmlPrecacheEntries,
  swSrc: 'src/lib/pwa/sw.ts',
  // Was `dest: 'public'`. This path is load-bearing in four places: Dockerfile:76
  // copies public/, scripts/verify-pwa-output.js asserts it,
  // scripts/check-uat-pwa-config.sh checks it, and RootClientLayout registers
  // '/sw.js'. Do not change it.
  swDest: 'public/sw.js',
  // The old `exclude: [/app-build-manifest\.json$/, /middleware-manifest\.json$/]`
  // has no equivalent here and needs none. Configurator mode only globs
  // `.next/static/**/*`, `.next/server/{app,pages}/**/*.html` and `public/**/*`.
  // Verified against a real Next 16.3.8 build of this repo: there is no
  // `app-build-manifest.json` anywhere in .next/ at all, and
  // middleware-manifest.json sits at `.next/server/middleware-manifest.json`,
  // outside every glob. Carrying the patterns over would be dead config.
  //
  // What does need ignoring: artifacts a previous @ducanh2912/next-pwa build may
  // have left in public/ (both are gitignored, so they linger in dirty working
  // trees and in any Docker context that is not a clean checkout).
  globIgnores: [
    // Re-added above through additionalPrecacheEntries with their real URLs.
    'public/**/*.html',
    'public/workbox-*.js',
    'public/fallback-*.js',
  ],
  // Parity, and the reason CI went red. `@serwist/next` defaults this to TRUE
  // (`dist/index.config.mjs:29,36`), which appends
  // `.next/server/{app,pages}/**/*.html` to the glob: every prerendered page
  // becomes a precache entry. `@ducanh2912/next-pwa` never did that. Measured
  // against the deployed next-pwa worker on https://ummahflow.com/sw.js, it took
  // the install-time requests that `src/middleware.ts` counts (everything except
  // /api, /_next/static, /_next/image, favicon.ico) from 54 to 112: +61 document
  // routes (/about, /login, 16 x /create/*, 20 x /city/*, ...).
  //
  // 112 of them cannot fit. The non-API bucket is 100 requests/min per client IP
  // (`src/middleware.ts:11-12`), the page view that triggers the install has
  // already spent part of it, so the tail of the precache gets 429s, Serwist's
  // install event rejects on any non-OK precache response, and the worker stays
  // stuck `installing` forever: no activation, no offline page, no push. Observed
  // directly: 10 x 429 on `/images/seals/*` with the worker still `installing`
  // after 8s and 86 of 112 entries cached. Then the registration does not survive
  // the session, which is what `e2e/sw-session-boundary.spec.ts` caught.
  //
  // Raising the limit is not the thing to change: in production nginx proxies
  // image and document requests to Next with the real client IP
  // (`deploy/nginx/nginx-uat-template.conf:161-170`), so a new visitor's first
  // page view plus a 112-request precache would blow their own budget too.
  // `src/middleware.ts` now exempts static-asset paths from the page bucket
  // (same class as `_next/static`, which the matcher always excluded), which is
  // what gives install real headroom. This option still stays false: 61 HTML
  // documents downloaded by every first-time visitor is a bandwidth cost, not
  // just a request count, and offline coverage is bought at runtime instead by
  // the same-origin document route in `src/lib/pwa/runtimeCaching.ts`.
  precachePrerendered: false,
  // Keep a classic (non-module) worker so `register('/sw.js')` without
  // `{ type: 'module' }` keeps working, matching today's registration call.
  esbuildOptions: { format: 'iife' },
});
