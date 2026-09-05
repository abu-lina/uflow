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

const prodConf = readFileSync(resolve(process.cwd(), 'deploy/nginx/nginx-template.conf'), 'utf-8');
const uatConf = readFileSync(
  resolve(process.cwd(), 'deploy/nginx/nginx-uat-template.conf'),
  'utf-8',
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

describe('nginx-template.conf — /api/chat extended timeout (Plan 223)', () => {
  it('has a location block for /api/chat', () => {
    expect(prodConf).toContain('location /api/chat');
  });

  it('sets proxy_read_timeout to 95s for /api/chat', () => {
    const blockStart = prodConf.indexOf('location /api/chat');
    expect(blockStart).toBeGreaterThan(0);
    const blockEnd = prodConf.indexOf('}', blockStart);
    const block = prodConf.slice(blockStart, blockEnd);
    expect(block).toContain('proxy_read_timeout 95s');
  });

  it('proxies /api/chat to port 3000 (production)', () => {
    const blockStart = prodConf.indexOf('location /api/chat');
    const blockEnd = prodConf.indexOf('}', blockStart);
    const block = prodConf.slice(blockStart, blockEnd);
    expect(block).toContain('proxy_pass http://localhost:3000');
  });

  it('places /api/chat BEFORE the catch-all location /', () => {
    const chatIdx = prodConf.indexOf('location /api/chat');
    const catchAllIdx = prodConf.indexOf('\n    location / {');
    expect(chatIdx).toBeGreaterThan(0);
    expect(catchAllIdx).toBeGreaterThan(0);
    expect(chatIdx).toBeLessThan(catchAllIdx);
  });

  it('places /api/chat AFTER /api/admin/', () => {
    const adminIdx = prodConf.indexOf('location /api/admin/');
    const chatIdx = prodConf.indexOf('location /api/chat');
    expect(adminIdx).toBeGreaterThan(0);
    expect(chatIdx).toBeGreaterThan(adminIdx);
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

describe('nginx-uat-template.conf — /api/chat extended timeout (Plan 223)', () => {
  it('has a location block for /api/chat', () => {
    expect(uatConf).toContain('location /api/chat');
  });

  it('sets proxy_read_timeout to 95s for /api/chat', () => {
    const blockStart = uatConf.indexOf('location /api/chat');
    expect(blockStart).toBeGreaterThan(0);
    const blockEnd = uatConf.indexOf('}', blockStart);
    const block = uatConf.slice(blockStart, blockEnd);
    expect(block).toContain('proxy_read_timeout 95s');
  });

  it('proxies /api/chat to port 3001 (UAT)', () => {
    const blockStart = uatConf.indexOf('location /api/chat');
    const blockEnd = uatConf.indexOf('}', blockStart);
    const block = uatConf.slice(blockStart, blockEnd);
    expect(block).toContain('proxy_pass http://localhost:3001');
  });

  it('places /api/chat BEFORE the catch-all location /', () => {
    const chatIdx = uatConf.indexOf('location /api/chat');
    const catchAllIdx = uatConf.indexOf('\n    location / {');
    expect(chatIdx).toBeGreaterThan(0);
    expect(catchAllIdx).toBeGreaterThan(0);
    expect(chatIdx).toBeLessThan(catchAllIdx);
  });

  it('places /api/chat AFTER /api/admin/', () => {
    const adminIdx = uatConf.indexOf('location /api/admin/');
    const chatIdx = uatConf.indexOf('location /api/chat');
    expect(adminIdx).toBeGreaterThan(0);
    expect(chatIdx).toBeGreaterThan(adminIdx);
  });
});
