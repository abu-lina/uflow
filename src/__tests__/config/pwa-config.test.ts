/**
 * Regression tests — Plan 046 + Plan 064 hotfix + request 282 (Serwist migration):
 * the service worker must not intercept Iconify CDN requests.
 *
 * ## The rule, which is verified and must not change
 *
 * No service-worker route may be registered for api.iconify.design,
 * api.unisvg.com or api.simplesvg.com. Registering one means the worker calls
 * `event.respondWith()` and re-issues the request from the service-worker
 * context, and that re-issued request behaved differently enough to stop icons
 * loading on /p/[id] ("no-response :: error:{}", status null) while the same
 * request succeeded when the browser made it directly. With no matching route
 * Serwist never calls respondWith, so the browser handles those requests
 * natively.
 *
 * Two separate incidents made this rule:
 * - 046: @ducanh2912/next-pwa@10.x silently ignored top-level workbox options,
 *   which activated its default cache, which contained a `!sameOrigin`
 *   NetworkFirst catch-all that matched Iconify.
 * - 064/069: a NetworkOnly route was then added for those domains as a safety
 *   net, which intercepted them explicitly and made things worse.
 *
 * ## The mechanism, corrected
 *
 * Retrospectives 064 and 069 (and the old version of this comment) attributed
 * the 064 regression to "Firefox Enhanced Tracking Protection blocks the
 * SW-context fetch". That attribution is UNVERIFIED and should be treated as
 * folklore: the three Iconify domains appear on none of the lists ETP
 * classifies by (0 matches in Disconnect's services.json, EasyPrivacy and
 * EasyList), and a Playwright Firefox 155 reproduction of the exact NetworkOnly
 * semantics returned HTTP 200 with ETP both on and off. The fix was right; the
 * explanation was not. See agent-output/research/282-defaultcache-iconify.md.
 *
 * That is also why there is no ETP Playwright spec: it would pass whether or
 * not the bug was present.
 *
 * ## What is tested where
 *
 * These tests assert the rule at the source. The build-time guard on the
 * shipped artifact is scripts/verify-sw-no-cross-origin-routes.mjs, which
 * executes the built public/sw.js and asserts `respondWith` is never called for
 * these origins. Both run; neither replaces the other.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

import { runtimeCaching } from '@/lib/pwa/runtimeCaching';

const nextConfigSource = readFileSync(resolve(process.cwd(), 'next.config.js'), 'utf-8');
const serwistConfigSource = readFileSync(resolve(process.cwd(), 'serwist.config.mjs'), 'utf-8');

// Stands in for the worker's `location.href`, which string matchers resolve
// against.
const SCOPE = 'https://ummahflow.com/sw.js';

const ICONIFY_URLS = [
  'https://api.iconify.design/lucide.json?icons=share-2',
  'https://api.unisvg.com/mdi.json?icons=instagram',
  'https://api.simplesvg.com/entypo.json?icons=old-phone',
];

/**
 * Mirrors how Serwist decides whether a route matches a given request, for all
 * three matcher shapes, and returns the rules that would match `rawUrl`.
 *
 * This is the structural mirror of the behavioural guard. The AUTHORITATIVE
 * check is `scripts/verify-sw-no-cross-origin-routes.mjs`, which executes the
 * built `public/sw.js` under `node:vm` and asserts `event.respondWith` is never
 * called for these origins; it runs on every build and must not be weakened or
 * deleted. This test is the fast feedback loop on the source, nothing more.
 */
function rulesMatching(rawUrl: string, { destination }: { destination?: string } = {}) {
  const url = new URL(rawUrl);
  const request = new Request(rawUrl, { method: 'GET' });
  // Node's Request always reports `destination === ''` and cannot be
  // constructed with one, while a real navigation reports `'document'`. Spelled
  // on, same as scripts/verify-sw-no-cross-origin-routes.mjs does, and verified
  // rather than assumed so a Node change cannot make these assertions vacuous.
  if (destination) {
    Object.defineProperty(request, 'destination', { value: destination, configurable: true });
    if (request.destination !== destination) {
      throw new Error(`Could not set request.destination to "${destination}" on this runtime.`);
    }
  }
  const sameOrigin = url.origin === new URL(SCOPE).origin;

  return runtimeCaching.filter(({ matcher }) => {
    if (matcher instanceof RegExp) {
      const result = matcher.exec(url.href);
      // Serwist's RegExpRoute only accepts a cross-origin match that starts at
      // index 0, so mirror that rule rather than treating any match as a hit.
      return result !== null && result.index === 0;
    }
    // A string matcher is an exact-URL route: Serwist's parseRoute resolves it
    // against the worker's location and compares `url.href`, so mirror that
    // rather than comparing the raw string.
    if (typeof matcher === 'string') return new URL(matcher, SCOPE).href === url.href;
    // A function matcher gets the same argument object Serwist builds in
    // `handleRequest`.
    return Boolean(matcher({ request, url, sameOrigin, event: undefined as never }));
  });
}

describe('service worker runtime caching (Plan 046 / 064 regression)', () => {
  it.each(ICONIFY_URLS)('registers no route matching %s', (rawUrl) => {
    expect(rulesMatching(rawUrl)).toEqual([]);
  });

  it('matches a Supabase Storage image, so the rules above are not vacuously empty', () => {
    const rawUrl = 'https://abcdefg.supabase.co/storage/v1/object/public/photos/a.jpg';
    const url = new URL(rawUrl);
    const matching = runtimeCaching.filter(
      ({ matcher }) => matcher instanceof RegExp && matcher.exec(url.href)?.index === 0,
    );
    expect(matching).toHaveLength(1);
  });

  it('consists of exactly the three rules: two ported, plus the document route', () => {
    // Asserted on the module's value, not its source text, so it catches
    // `runtimeCaching = defaultCache` (1 entry in dev, 20 in production) and any
    // fourth rule added without a matching assertion above.
    expect(runtimeCaching).toHaveLength(3);
    expect(runtimeCaching.map((entry) => entry.handler.constructor.name)).toEqual([
      'CacheFirst',
      'StaleWhileRevalidate',
      'NetworkFirst',
    ]);
  });

  it.each(['/', '/food'])(
    'keeps a document route for %s, which is what makes the offline fallback reachable',
    (path) => {
      // A route that handles a document request is the ONLY thing that lets
      // `fallbacks` in src/lib/pwa/sw.ts fire, because Serwist attaches the
      // fallback as a `handlerDidError` plugin on the runtimeCaching strategies
      // rather than as a global navigation handler. Dropping it silently kills
      // the offline page.
      //
      // `/food` is here because the route is deliberately wider than the
      // `matcher: '/'` start-url route it replaced: offline now works on any
      // page the user has visited. The alternative way to get that coverage,
      // `precachePrerendered: true`, downloads 61 HTML documents on install and
      // is asserted off below.
      //
      // The artifact-level guards are the two document controls in
      // scripts/verify-sw-no-cross-origin-routes.mjs. This asserts the shape;
      // those assert the built worker really intercepts these navigations.
      const matching = rulesMatching(`${new URL(SCOPE).origin}${path}`, {
        destination: 'document',
      });
      expect(matching).toHaveLength(1);
      expect(matching[0].handler.constructor.name).toBe('NetworkFirst');
    },
  );

  it('matches only documents, so a same-origin asset is left to the precache route', () => {
    // Guards against the document matcher being broadened to every same-origin
    // request, which would put the precached `/images/**` and `/_next/static/**`
    // responses behind a NetworkFirst 'pages' cache.
    const origin = new URL(SCOPE).origin;
    expect(rulesMatching(`${origin}/images/seals/halal.png`, { destination: 'image' })).toEqual([]);
    expect(rulesMatching(`${origin}/`, { destination: 'image' })).toEqual([]);
  });

  it('every matcher evaluates to false for the Iconify origins, whatever its shape', () => {
    // This replaced a blanket "no function matcher" ban. The ban existed to rule
    // out defaultCache's entry 19, `({ sameOrigin }) => !sameOrigin`, by shape;
    // the property it was standing in for is the one asserted here and in the
    // it.each above, and that property is strictly stronger. `!sameOrigin`
    // returns true for all three Iconify URLs and is rejected;
    // `sameOrigin && destination === 'document'` returns false and is allowed.
    //
    // The authoritative check remains the behavioural one in
    // scripts/verify-sw-no-cross-origin-routes.mjs, against the built sw.js.
    for (const rawUrl of ICONIFY_URLS) {
      const url = new URL(rawUrl);
      // Documents, images and the default destination, so a matcher cannot pass
      // this merely by reading `request.destination`.
      for (const destination of ['document', 'image', undefined] as const) {
        expect(rulesMatching(rawUrl, { destination }), `${rawUrl} as ${destination}`).toEqual([]);
      }
      expect(url.origin).not.toBe(new URL(SCOPE).origin);
    }

    // RegExp matchers stay `^`-anchored: the `^` is what Serwist's RegExpRoute
    // needs to accept a cross-origin match at all (it requires match index 0),
    // so an unanchored rewrite would silently stop matching Supabase while
    // gaining the ability to match things mid-URL.
    for (const { matcher } of runtimeCaching) {
      if (matcher instanceof RegExp) {
        expect(matcher.source.startsWith('^')).toBe(true);
      } else if (typeof matcher === 'string') {
        expect(matcher.startsWith('/')).toBe(true);
      } else {
        expect(typeof matcher).toBe('function');
      }
    }
  });

  it('keeps the service worker at public/sw.js', () => {
    // Load-bearing in four places: Dockerfile:76 copies public/,
    // scripts/verify-pwa-output.js asserts the path,
    // scripts/check-uat-pwa-config.sh checks it in the container, and
    // RootClientLayout registers '/sw.js'.
    expect(serwistConfigSource).toContain("swDest: 'public/sw.js'");
  });

  it('does not precache prerendered pages, which blows the rate-limit budget on install', () => {
    // `@serwist/next` defaults `precachePrerendered` to true and appends
    // `.next/server/{app,pages}/**/*.html` to the glob. That added 61 document
    // routes (/about, /login, 16 x /create/*, 20 x /city/*) that
    // @ducanh2912/next-pwa never precached, taking the install-time requests
    // `src/middleware.ts` counts from 54 to 112 against a 100 req/min per-IP
    // bucket. The tail 429s, Serwist rejects install on any non-OK precache
    // response, and the worker stays stuck `installing`: no activation, no
    // offline page, no push. Measured: 10 x 429, 86 of 112 entries cached, worker
    // `installing` after 8s. With it false: 0 x 429, 290 entries, `activated`.
    expect(serwistConfigSource).toContain('precachePrerendered: false');
  });

  it('no longer configures the PWA through next.config.js', () => {
    // @ducanh2912/next-pwa is gone, so the `workboxOptions:` nesting that
    // incident 046 was about cannot recur. The config now lives in
    // serwist.config.mjs and src/lib/pwa/.
    // The require(), not the string: next.config.js still explains in comments
    // why the plugin was removed, and that explanation is worth keeping.
    expect(nextConfigSource).not.toContain("require('@ducanh2912/next-pwa')");
    expect(nextConfigSource).not.toContain('withPWA(');
    expect(nextConfigSource).not.toContain('workboxOptions');
    expect(nextConfigSource).not.toContain('runtimeCaching:');
  });
});

describe('next.config.js CSP configuration (Plan 064 regression)', () => {
  it('does not include Iconify API domains in frame-src (they are JSON APIs, not iframe sources)', () => {
    // frame-src restricts <iframe>/<frame> embedding sources.
    // Iconify APIs serve JSON — they are never embedded as iframes.
    // They belong in connect-src and default-src only.
    const frameSrcLine = nextConfigSource.split('\n').find((line) => line.includes('frame-src'));
    expect(frameSrcLine).toBeDefined();
    expect(frameSrcLine).not.toContain('api.iconify.design');
    expect(frameSrcLine).not.toContain('api.unisvg.com');
    expect(frameSrcLine).not.toContain('api.simplesvg.com');
  });

  it('retains Iconify API domains in connect-src (required for fetch() calls from @iconify/react)', () => {
    const connectSrcIdx = nextConfigSource.indexOf("'connect-src'");
    expect(connectSrcIdx).toBeGreaterThan(0);
    // Grab enough context around connect-src to find all its origins
    const connectSrcChunk = nextConfigSource.slice(connectSrcIdx, connectSrcIdx + 400);
    expect(connectSrcChunk).toContain('api.iconify.design');
    expect(connectSrcChunk).toContain('api.unisvg.com');
    expect(connectSrcChunk).toContain('api.simplesvg.com');
  });
});
