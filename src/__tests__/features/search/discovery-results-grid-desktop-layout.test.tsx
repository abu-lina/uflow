/**
 * Plan 228 - Desktop header overlap fix for DiscoveryResultsGrid
 *
 * Verifies that on desktop (md+), the grid container:
 *   1. Uses static positioning (not fixed) so it respects parent <main> padding
 *   2. Does not apply headerOffset as paddingTop (parent handles it)
 *   3. Preserves fixed positioning for mobile
 *
 * These are source-level pattern tests (fast, no DOM rendering needed).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const gridSrc = readFileSync(
  resolve(__dirname, '../../../features/search/components/DiscoveryResultsGrid.tsx'),
  'utf-8',
);

describe('Plan 228 - DiscoveryResultsGrid desktop layout', () => {
  it('uses md:static to remove fixed positioning on desktop', () => {
    expect(gridSrc).toContain('md:static');
  });

  it('uses md:inset-auto to remove inset-0 on desktop', () => {
    expect(gridSrc).toContain('md:inset-auto');
  });

  it('uses md:z-auto to remove z-[21] on desktop', () => {
    expect(gridSrc).toContain('md:z-auto');
  });

  it('preserves fixed inset-0 for mobile', () => {
    // The base classes should still contain fixed and inset-0
    expect(gridSrc).toContain('fixed');
    expect(gridSrc).toContain('inset-0');
  });

  it('does not import useIsMobile (replaced with CSS-only approach)', () => {
    // Plan 250: useIsMobile removed; desktop padding reset is handled by md:!pt-0 class
    expect(gridSrc).not.toContain('useIsMobile');
  });

  it('resets paddingTop on desktop via Tailwind md:!pt-0', () => {
    // Plan 250: instead of JS conditional, use CSS override on md+ screens
    expect(gridSrc).toContain('md:!pt-0');
  });
});
