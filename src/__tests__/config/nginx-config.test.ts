/**
 * Regression tests — Plan 064: sw-push-handler.js nginx cache fix
 *
 * Bug: /sw-push-handler.js had no exact-match nginx location block. It fell
 * through to `location ~* \.(js)$` and received:
 *   Cache-Control: public, immutable
 *   Expires: 1 year
 *
 * The service worker imports this file via importScripts('/sw-push-handler.js').
 * With a 1-year immutable cache the browser HTTP cache would serve stale push
 * handler code even after a new SW version was installed, silently breaking push
 * notification updates.
 *
 * Fix: Add `location = /sw-push-handler.js` exact-match block (identical
 * no-cache treatment to `location = /sw.js`) before the generic JS rule in
 * both nginx-template.conf and nginx-uat-template.conf.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const prodConf = readFileSync(
  resolve(process.cwd(), 'deploy/nginx/nginx-template.conf'),
  'utf-8'
);
const uatConf = readFileSync(
  resolve(process.cwd(), 'deploy/nginx/nginx-uat-template.conf'),
  'utf-8'
);

describe('nginx-template.conf — sw-push-handler.js cache fix (Plan 064)', () => {
  it('has an exact-match location block for /sw-push-handler.js', () => {
    expect(prodConf).toContain('location = /sw-push-handler.js');
  });

  it('serves /sw-push-handler.js with no-cache headers', () => {
    // Locate the block
    const blockStart = prodConf.indexOf('location = /sw-push-handler.js');
    expect(blockStart).toBeGreaterThan(0);
    const blockChunk = prodConf.slice(blockStart, blockStart + 600);
    expect(blockChunk).toContain('no-cache, no-store, must-revalidate');
    expect(blockChunk).toContain('Pragma "no-cache"');
    expect(blockChunk).toContain('Expires "0"');
  });

  it('places /sw-push-handler.js block BEFORE the generic location ~* \\.(js)$ rule', () => {
    // If sw-push-handler.js came AFTER the regex rule nginx would never reach it
    // (the regex rule matches first for *.js files when not an exact match target).
    // nginx resolves exact matches before prefix/regex, but having it listed before
    // the regex rule makes the intent explicit and matches the sw.js precedent.
    // Search with newline prefix to avoid matching the comment text inside the block.
    const pushHandlerIdx = prodConf.indexOf('location = /sw-push-handler.js');
    const genericJsIdx = prodConf.indexOf('\n    location ~* \\.(js)$');
    expect(pushHandlerIdx).toBeGreaterThan(0);
    expect(genericJsIdx).toBeGreaterThan(0);
    expect(pushHandlerIdx).toBeLessThan(genericJsIdx);
  });

  it('does NOT give /sw-push-handler.js a 1-year cache (immutable would break SW updates)', () => {
    const blockStart = prodConf.indexOf('location = /sw-push-handler.js');
    const blockEnd = prodConf.indexOf('}', blockStart + 50); // closing brace of the block
    const block = prodConf.slice(blockStart, blockEnd);
    expect(block).not.toContain('immutable');
    expect(block).not.toContain('expires 1y');
  });
});

describe('nginx-uat-template.conf — sw-push-handler.js cache fix (Plan 064)', () => {
  it('has an exact-match location block for /sw-push-handler.js', () => {
    expect(uatConf).toContain('location = /sw-push-handler.js');
  });

  it('serves /sw-push-handler.js with no-cache headers', () => {
    const blockStart = uatConf.indexOf('location = /sw-push-handler.js');
    expect(blockStart).toBeGreaterThan(0);
    const blockChunk = uatConf.slice(blockStart, blockStart + 600);
    expect(blockChunk).toContain('no-cache, no-store, must-revalidate');
    expect(blockChunk).toContain('Pragma "no-cache"');
    expect(blockChunk).toContain('Expires "0"');
  });

  it('places /sw-push-handler.js block BEFORE the generic location ~* \\.(js)$ rule', () => {
    // Search with newline prefix to avoid matching the comment text inside the block.
    const pushHandlerIdx = uatConf.indexOf('location = /sw-push-handler.js');
    const genericJsIdx = uatConf.indexOf('\n    location ~* \\.(js)$');
    expect(pushHandlerIdx).toBeGreaterThan(0);
    expect(genericJsIdx).toBeGreaterThan(0);
    expect(pushHandlerIdx).toBeLessThan(genericJsIdx);
  });
});
