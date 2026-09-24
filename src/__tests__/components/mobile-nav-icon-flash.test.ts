/**
 * Regression tests for GitHub issue #227: mobile nav icon flash.
 *
 * Two root causes:
 * 1. Active/inactive SVGs render at different pixel sizes, causing a layout shift on tap.
 * 2. `isNavigating` applies `opacity-50` to all nav links for 150 ms, causing a visible flash.
 *
 * These are source-reading tests: they parse the actual component source files and assert
 * structural invariants. No jsdom or React rendering needed.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const iconsDir = path.resolve(__dirname, '../../components/ui/icons');
const footerBarPath = path.resolve(__dirname, '../../components/common/MobileFooterBar.tsx');

/**
 * Extract all width/height attribute pairs from <svg ...> tags in a source string.
 * Handles both JSX `width={24}` and HTML `width="24"` attribute syntax.
 * Returns an array of { width, height } objects.
 */
function extractSvgDimensions(source: string): { width: string; height: string }[] {
  const svgTagRegex = /<svg[\s\S]*?>/g;
  // Matches: width="24", width={24}, width={"24"}
  const dimRegex = (attr: string) => new RegExp(`\\b${attr}[={"]+(\\d+)`);
  const results: { width: string; height: string }[] = [];

  let match;
  while ((match = svgTagRegex.exec(source)) !== null) {
    const tag = match[0];
    const widthMatch = tag.match(dimRegex('width'));
    const heightMatch = tag.match(dimRegex('height'));
    if (widthMatch && heightMatch) {
      results.push({ width: widthMatch[1], height: heightMatch[1] });
    }
  }
  return results;
}

describe('Issue #227 – nav icon sizes must match between active/inactive', () => {
  const iconFiles = ['SavedIcon.tsx', 'ProfileIcon.tsx', 'ExploreIcon.tsx'];

  iconFiles.forEach((fileName) => {
    it(`${fileName}: active and inactive SVGs have identical width and height`, () => {
      const source = fs.readFileSync(path.join(iconsDir, fileName), 'utf-8');
      const dims = extractSvgDimensions(source);

      expect(dims.length).toBeGreaterThanOrEqual(2);

      // All SVG tags in the component should share the same dimensions.
      const first = dims[0];
      dims.forEach((d, i) => {
        expect(d.width, `SVG #${i} width mismatch in ${fileName}`).toBe(first.width);
        expect(d.height, `SVG #${i} height mismatch in ${fileName}`).toBe(first.height);
      });
    });
  });
});

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
