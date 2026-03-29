/**
 * Regression tests — Plan 046 + Plan 064 hotfix: Iconify PWA service-worker intercept fix
 *
 * Root cause verified in agent-output/analysis/closed/046-iconify-pwa-analysis.md:
 * @ducanh2912/next-pwa@10.x silently ignores workbox-specific options (runtimeCaching,
 * importScripts, exclude/buildExcludes) when they are placed at the TOP LEVEL of
 * withPWA({...}). They must be nested inside workboxOptions: { ... }.
 *
 * When top-level options are ignored:
 * - The default cache activates, including a `!sameOrigin` NetworkFirst catch-all
 * - Combined with fallbacks.document, a handlerDidError plugin returns Response.error()
 *   for generic XHR/fetch requests (request.destination === "")
 * - Iconify CDN API calls (api.iconify.design, api.unisvg.com, api.simplesvg.com)
 *   match the cross-origin catch-all and hit the error path → CORS failure
 *
 * Plan 064 hotfix (UAT regression):
 * The Plan 064 release added a NetworkOnly route as a safety net. In UAT this caused a
 * NEW failure mode: the SW intercepted Iconify requests and re-issued fetch() from the
 * service-worker context. In Firefox ETP (Enhanced Tracking Protection) or with content
 * blockers, that SW-context cross-origin fetch is blocked at network level (status null),
 * producing "no-response :: error:{}" regardless of CORS headers on the Iconify server.
 * The NetworkOnly route is unnecessary because correctly nesting workboxOptions (tested
 * below) already eliminates the default catch-all. Without a registered route Workbox
 * does NOT intercept Iconify requests — the browser handles them natively.
 *
 * These tests assert the CORRECT config shape so neither mis-placement can silently
 * recur in future edits.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const configSource = readFileSync(resolve(process.cwd(), 'next.config.js'), 'utf-8');

describe('next.config.js PWA configuration (Plan 046 regression)', () => {
  it('contains workboxOptions block — required by @ducanh2912/next-pwa@10.x API', () => {
    // Top-level withPWA options (pre-v10 shape) are silently ignored by v10.
    // All workbox-specific settings must live inside workboxOptions: { ... }.
    expect(configSource).toContain('workboxOptions:');
  });

  it('does not have runtimeCaching at the top level of withPWA() — would be silently ignored', () => {
    // Two-space indent = top level of withPWA({...}). If this pattern exists,
    // the array is consumed by the @ducanh2912/next-pwa option parser but never
    // forwarded to Workbox, activating the default !sameOrigin NetworkFirst cache.
    expect(configSource).not.toContain('\n  runtimeCaching:');
  });

  it('does not have importScripts at the top level of withPWA() — would be silently ignored', () => {
    // importScripts at top level is ignored in v10; the push handler would not
    // be imported into the generated service worker.
    expect(configSource).not.toContain('\n  importScripts:');
  });

  it('does NOT register any explicit service-worker route for Iconify CDN API domains', () => {
    // Plan 064 hotfix regression: the original release added `handler: 'NetworkOnly'`
    // for Iconify domains as a safety net, but this caused SW to re-issue fetch() from
    // the SW context. Firefox ETP and content blockers block SW-context cross-origin
    // fetches to CDN domains at network level (status null) regardless of CORS headers.
    //
    // The correct behaviour: NO runtimeCaching entry at all for these domains.
    // With workboxOptions correctly nested (tested above), Workbox does not generate
    // the default !sameOrigin catch-all, so Iconify requests are never intercepted —
    // the browser's native fetch handles them without any SW restriction.
    //
    // This test checks that the code literal `'NetworkOnly'` (handler value) is absent,
    // which confirms no route registers that handler in the runtimeCaching array.
    expect(configSource).not.toContain("'NetworkOnly'");
  });

  it('does not have a urlPattern regex that intercepts Iconify CDN origins', () => {
    // The regex pattern that previously matched the three Iconify CDN domains had the
    // form: /^https:\/\/(api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\//
    // Verify the escaped-dot form (regex literal) is gone from active code.
    // Plain-text references in comments use unescaped dots and will NOT match this.
    expect(configSource).not.toContain('api\\.iconify\\.design|api\\.unisvg\\.com');
  });
});

describe('next.config.js CSP configuration (Plan 064 regression)', () => {
  it('does not include Iconify API domains in frame-src (they are JSON APIs, not iframe sources)', () => {
    // frame-src restricts <iframe>/<frame> embedding sources.
    // Iconify APIs serve JSON — they are never embedded as iframes.
    // They belong in connect-src and default-src only.
    const frameSrcLine = configSource
      .split('\n')
      .find((line) => line.includes('frame-src'));
    expect(frameSrcLine).toBeDefined();
    expect(frameSrcLine).not.toContain('api.iconify.design');
    expect(frameSrcLine).not.toContain('api.unisvg.com');
    expect(frameSrcLine).not.toContain('api.simplesvg.com');
  });

  it('retains Iconify API domains in connect-src (required for fetch() calls from @iconify/react)', () => {
    const connectSrcIdx = configSource.indexOf("'connect-src'");
    expect(connectSrcIdx).toBeGreaterThan(0);
    // Grab enough context around connect-src to find all its origins
    const connectSrcChunk = configSource.slice(connectSrcIdx, connectSrcIdx + 400);
    expect(connectSrcChunk).toContain('api.iconify.design');
    expect(connectSrcChunk).toContain('api.unisvg.com');
    expect(connectSrcChunk).toContain('api.simplesvg.com');
  });
});

describe('next.config.js CSP configuration (Plan 064 regression)', () => {
  it('does not include Iconify API domains in frame-src (they are JSON APIs, not iframe sources)', () => {
    // frame-src restricts <iframe>/<frame> embedding sources.
    // Iconify APIs serve JSON — they are never embedded as iframes.
    // They belong in connect-src and default-src only.
    const frameSrcLine = configSource
      .split('\n')
      .find((line) => line.includes('frame-src'));
    expect(frameSrcLine).toBeDefined();
    expect(frameSrcLine).not.toContain('api.iconify.design');
    expect(frameSrcLine).not.toContain('api.unisvg.com');
    expect(frameSrcLine).not.toContain('api.simplesvg.com');
  });

  it('retains Iconify API domains in connect-src (required for fetch() calls from @iconify/react)', () => {
    const connectSrcIdx = configSource.indexOf("'connect-src'");
    expect(connectSrcIdx).toBeGreaterThan(0);
    // Grab enough context around connect-src to find all its origins
    const connectSrcChunk = configSource.slice(connectSrcIdx, connectSrcIdx + 400);
    expect(connectSrcChunk).toContain('api.iconify.design');
    expect(connectSrcChunk).toContain('api.unisvg.com');
    expect(connectSrcChunk).toContain('api.simplesvg.com');
  });
});
