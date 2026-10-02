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

const ICONIFY_URLS = [
  'https://api.iconify.design/lucide.json?icons=share-2',
  'https://api.unisvg.com/mdi.json?icons=instagram',
  'https://api.simplesvg.com/entypo.json?icons=old-phone',
];

describe('service worker runtime caching (Plan 046 / 064 regression)', () => {
  it.each(ICONIFY_URLS)('registers no route matching %s', (rawUrl) => {
    const url = new URL(rawUrl);
    const request = new Request(rawUrl, { method: 'GET' });

    const matching = runtimeCaching.filter(({ matcher }) => {
      if (matcher instanceof RegExp) {
        const result = matcher.exec(url.href);
        // Serwist's RegExpRoute only accepts a cross-origin match that starts at
        // index 0, so mirror that rule rather than treating any match as a hit.
        return result !== null && result.index === 0;
      }
      // A string matcher is an exact-URL route.
      if (typeof matcher === 'string') return matcher === url.href;
      return Boolean(
        matcher({
          request,
          url,
          sameOrigin: false,
          event: undefined as never,
        }),
      );
    });

    expect(matching).toEqual([]);
  });

  it('matches a Supabase Storage image, so the rules above are not vacuously empty', () => {
    const rawUrl = 'https://abcdefg.supabase.co/storage/v1/object/public/photos/a.jpg';
    const url = new URL(rawUrl);
    const matching = runtimeCaching.filter(
      ({ matcher }) => matcher instanceof RegExp && matcher.exec(url.href)?.index === 0,
    );
    expect(matching).toHaveLength(1);
  });

  it('consists of exactly the two ported rules', () => {
    // Asserted on the module's value, not its source text, so it catches
    // `runtimeCaching = defaultCache` (1 entry in dev, 20 in production) and any
    // third rule added without a matching assertion above.
    expect(runtimeCaching).toHaveLength(2);
    expect(runtimeCaching.map((entry) => entry.handler.constructor.name)).toEqual([
      'CacheFirst',
      'StaleWhileRevalidate',
    ]);
  });

  it('uses only anchored RegExp matchers, so no function matcher can test sameOrigin', () => {
    // defaultCache's entry 19 is `({ sameOrigin }) => !sameOrigin`, a function
    // matcher. Requiring every matcher to be a `^`-anchored RegExp rules that
    // shape out structurally, and the `^` is what Serwist's RegExpRoute needs to
    // accept a cross-origin match at all (it requires match index 0), so an
    // unanchored rewrite would silently stop matching Supabase while gaining the
    // ability to match things mid-URL.
    for (const { matcher } of runtimeCaching) {
      expect(matcher).toBeInstanceOf(RegExp);
      expect((matcher as RegExp).source.startsWith('^')).toBe(true);
    }
  });

  it('keeps the service worker at public/sw.js', () => {
    // Load-bearing in four places: Dockerfile:76 copies public/,
    // scripts/verify-pwa-output.js asserts the path,
    // scripts/check-uat-pwa-config.sh checks it in the container, and
    // RootClientLayout registers '/sw.js'.
    expect(serwistConfigSource).toContain("swDest: 'public/sw.js'");
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
