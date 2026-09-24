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
const iconsDir = path.resolve(__dirname, '../../components/ui/icons');

const iconFiles = ['ExploreIcon.tsx', 'SavedIcon.tsx', 'ProfileIcon.tsx'] as const;

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

describe('Issue #227 – Nav icons use opacity crossfade (no conditional rendering)', () => {
  for (const file of iconFiles) {
    const iconName = file.replace('.tsx', '');

    describe(iconName, () => {
      const source = fs.readFileSync(path.join(iconsDir, file), 'utf-8');

      it('contains transition-opacity for crossfade', () => {
        expect(source).toContain('transition-opacity');
      });

      it('renders both SVGs simultaneously (no conditional branch)', () => {
        // Count <svg occurrences; crossfade means both are always rendered
        const svgCount = (source.match(/<svg/g) || []).length;
        expect(svgCount).toBe(2);
      });

      it('does not use if/else conditional rendering', () => {
        // Should not have "if (isActive)" pattern
        expect(source).not.toMatch(/if\s*\(\s*isActive\s*\)/);
      });
    });
  }
});
