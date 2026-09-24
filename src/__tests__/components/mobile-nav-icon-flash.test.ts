/**
 * Regression tests for GitHub issue #227: mobile nav icon flash.
 *
 * Root cause: `isNavigating` applies `opacity-50` to all nav links for 150 ms, causing a visible flash.
 *
 * These are source-reading tests: they parse the actual component source files and assert
 * structural invariants. No jsdom or React rendering needed.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const footerBarPath = path.resolve(__dirname, '../../components/common/MobileFooterBar.tsx');

describe('Issue #227 – MobileFooterBar must not flash opacity', () => {
  it('does not apply opacity-50 class', () => {
    const source = fs.readFileSync(footerBarPath, 'utf-8');
    expect(source).not.toContain('opacity-50');
  });

  it('does not apply transition-opacity', () => {
    const source = fs.readFileSync(footerBarPath, 'utf-8');
    expect(source).not.toContain('transition-opacity');
  });

  it('still uses pointer-events-none for double-tap guard', () => {
    const source = fs.readFileSync(footerBarPath, 'utf-8');
    expect(source).toContain('pointer-events-none');
  });
});
