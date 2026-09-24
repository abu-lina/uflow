// @vitest-environment jsdom
/**
 * Plan 248: Mobile page transition flash
 *
 * Root causes:
 * 1. useIsMobile initializes as false, causing double-skeleton on mobile
 *    (modal skeleton -> page skeleton -> content)
 * 2. ProviderDetailPageComponent uses ssr:false + skeleton fallback
 * 3. Card components use router.push without prefetching
 *
 * These tests verify each fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Fix 1: useIsMobile sync initialization
// The bug: useState(false) means the FIRST render always returns false,
// even on mobile. The useEffect then flips it to true, causing a re-render
// and double-skeleton flash. The fix: use a lazy initializer that reads
// window.innerWidth synchronously.
// ---------------------------------------------------------------------------
describe('useIsMobile sync initialization', () => {
  it('initial useState value is synced from window.innerWidth, not hardcoded false', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useIsMobile.ts'), 'utf-8');

    // Extract the useIsMobile function body
    const fnStart = src.indexOf('export function useIsMobile()');
    const fnBody = src.slice(fnStart, src.indexOf('export function useIsSmallMobile'));

    // Must NOT contain useState(false) — the old hardcoded init that causes double-render
    expect(fnBody).not.toMatch(/useState\(false\)/);
    // Must use a lazy initializer that reads window.innerWidth
    expect(fnBody).toMatch(/useState\(\s*\(\)\s*=>/);
    expect(fnBody).toContain('window.innerWidth');
  });

  it('initial useState value for useIsSmallMobile is synced, not hardcoded false', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useIsMobile.ts'), 'utf-8');

    // Extract the useIsSmallMobile function body
    const fnStart = src.indexOf('export function useIsSmallMobile()');
    const fnBody = src.slice(fnStart);

    expect(fnBody).not.toMatch(/useState\(false\)/);
    expect(fnBody).toMatch(/useState\(\s*\(\)\s*=>/);
    expect(fnBody).toContain('window.innerWidth');
  });
});

// ---------------------------------------------------------------------------
// Fix 2: ProviderDetailPageComponent dynamic import should NOT have ssr:false
// ---------------------------------------------------------------------------
describe('ProviderDetailPageClient ssr:false removal', () => {
  it('ProviderDetailPageComponent (mobile) dynamic import does not set ssr:false', () => {
    const src = readFileSync(
      resolve(__dirname, '../../app/(public)/p/[id]/ProviderDetailPageClient.tsx'),
      'utf-8',
    );

    // The mobile dynamic() call is the second one (ProviderDetailPageComponent).
    // Find the block between the two dynamic() calls.
    const mobileBlock = src.slice(
      src.indexOf("import('@/features/providers/pages/ProviderDetailPage')"),
    );

    // The next dynamic() call or end of dynamic block
    const blockEnd = mobileBlock.indexOf(');');
    const mobileDynamicBlock = mobileBlock.slice(0, blockEnd);

    expect(mobileDynamicBlock).not.toContain('ssr: false');
  });

  it('ProviderDetailModal (desktop) dynamic import still has ssr:false', () => {
    const src = readFileSync(
      resolve(__dirname, '../../app/(public)/p/[id]/ProviderDetailPageClient.tsx'),
      'utf-8',
    );

    // The desktop dynamic() call is the first one (ProviderDetailModal).
    const desktopBlock = src.slice(
      src.indexOf("import('@/features/providers/pages/ProviderDetailModal')"),
      src.indexOf("import('@/features/providers/pages/ProviderDetailPage')"),
    );

    expect(desktopBlock).toContain('ssr: false');
  });
});

// ---------------------------------------------------------------------------
// Fix 3: Card components prefetch on hover/touch
// ---------------------------------------------------------------------------
describe('Card components prefetch routes', () => {
  it('DiscoveryResultsGrid card wrappers have onTouchStart for prefetch', () => {
    const src = readFileSync(
      resolve(__dirname, '../../features/search/components/DiscoveryResultsGrid.tsx'),
      'utf-8',
    );

    // The card wrapper div should have onTouchStart or onMouseEnter for prefetch
    expect(src).toMatch(/onTouchStart|onMouseEnter/);
    // And it should call router.prefetch
    expect(src).toContain('router.prefetch');
  });

  it('HomeNearMeList card wrappers have onTouchStart for prefetch', () => {
    const src = readFileSync(
      resolve(__dirname, '../../features/search/components/HomeNearMeList.tsx'),
      'utf-8',
    );

    expect(src).toMatch(/onTouchStart|onMouseEnter/);
    expect(src).toContain('router.prefetch');
  });

  it('HomeListView card wrappers have onTouchStart for prefetch', () => {
    const src = readFileSync(
      resolve(__dirname, '../../features/search/components/HomeListView.tsx'),
      'utf-8',
    );

    expect(src).toMatch(/onTouchStart|onMouseEnter/);
    expect(src).toContain('router.prefetch');
  });
});
