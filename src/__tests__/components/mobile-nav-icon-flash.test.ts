/**
 * Regression tests for GitHub issue #227: mobile nav icon flash.
 *
 * Root cause: `isNavigating` applies `opacity-50` to all nav links for 150 ms, causing a visible flash.
 * Fix: icons render both active and inactive SVGs simultaneously with an opacity crossfade,
 * eliminating mount/unmount size pop on tab switch.
 *
 * These are source-reading tests: they parse the actual component source files and assert
 * structural invariants. No jsdom or React rendering needed.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const footerBarPath = path.resolve(__dirname, '../../components/common/MobileFooterBar.tsx');
const savedIconPath = path.resolve(__dirname, '../../components/ui/icons/SavedIcon.tsx');
const profileIconPath = path.resolve(__dirname, '../../components/ui/icons/ProfileIcon.tsx');
const exploreIconPath = path.resolve(__dirname, '../../components/ui/icons/ExploreIcon.tsx');

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

describe('Issue #227 – Nav icons use opacity crossfade (no mount/unmount pop)', () => {
  const iconFiles = [
    { name: 'SavedIcon', path: savedIconPath },
    { name: 'ProfileIcon', path: profileIconPath },
    { name: 'ExploreIcon', path: exploreIconPath },
  ];

  for (const icon of iconFiles) {
    it(`${icon.name} contains transition-opacity for crossfade`, () => {
      const source = fs.readFileSync(icon.path, 'utf-8');
      expect(source).toContain('transition-opacity');
    });

    it(`${icon.name} renders both active and inactive SVGs (two <svg elements)`, () => {
      const source = fs.readFileSync(icon.path, 'utf-8');
      const svgCount = (source.match(/<svg/g) || []).length;
      expect(svgCount).toBe(2);
    });

    it(`${icon.name} does not conditionally return early (no if/else branches)`, () => {
      const source = fs.readFileSync(icon.path, 'utf-8');
      // The old pattern: "if (isActive) { return (" -- should no longer exist
      expect(source).not.toMatch(/if\s*\(\s*isActive\s*\)\s*\{?\s*\n?\s*return/);
    });
  }
});
