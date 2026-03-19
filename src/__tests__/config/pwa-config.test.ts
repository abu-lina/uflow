/**
 * Regression tests — Plan 046: Iconify PWA service-worker intercept fix
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
 * These tests assert the CORRECT config shape so the mis-placement cannot silently
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

  it('includes a NetworkOnly bypass rule for all three Iconify CDN fallback origins', () => {
    // @iconify/react issues runtime fetch() calls to these JSON API endpoints.
    // The service worker must never cache or intercept them — a cache miss or
    // network error causes Response.error() via handlerDidError → CORS failure.
    expect(configSource).toContain('NetworkOnly');
    expect(configSource).toContain('api.iconify.design');
    expect(configSource).toContain('api.unisvg.com');
    expect(configSource).toContain('api.simplesvg.com');
  });

  it('places the Iconify NetworkOnly rule BEFORE other caching entries (rule precedence)', () => {
    // Workbox evaluates routes in order. The NetworkOnly bypass must be first so
    // it takes precedence over broader image/JS rules that could still match.
    const networkOnlyIdx = configSource.indexOf("'NetworkOnly'");
    const firstCacheNameIdx = configSource.indexOf('cacheName:');
    expect(networkOnlyIdx).toBeGreaterThan(0); // rule must exist
    expect(networkOnlyIdx).toBeLessThan(firstCacheNameIdx); // must precede other entries
  });
});
