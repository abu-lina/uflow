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
// See agent-output/research/282-defaultcache-iconify.md for the option-by-option
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
  // Keep a classic (non-module) worker so `register('/sw.js')` without
  // `{ type: 'module' }` keeps working, matching today's registration call.
  esbuildOptions: { format: 'iife' },
});
