// @vitest-environment jsdom
/**
 * Plan 248: Mobile page transition flash
 *
 * Root causes addressed:
 * 1. useIsMobile must stay hydration-safe (useState(false)) so server and
 *    client initial renders match. The desktop/mobile switch is handled by
 *    CSS visibility classes, not JS branching.
 * 2. ProviderDetailPageComponent uses SSR (no ssr:false) so Next.js renders
 *    real content server-side instead of a skeleton fallback.
 * 3. Card components prefetch on hover/touch to avoid cold navigations.
 *
 * These tests verify each fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Fix 1: useIsMobile stays hydration-safe (useState(false))
// The hook must NOT use a window-reading lazy initializer because 'use client'
// components are still SSR'd in Next.js App Router. A sync initializer that
// reads window.innerWidth causes server=false / client=true hydration mismatch
// for 35+ callers.
// ---------------------------------------------------------------------------
describe('useIsMobile hydration safety', () => {
  it('useIsMobile initializes with useState(false) for hydration safety', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useIsMobile.ts'), 'utf-8');

    const fnStart = src.indexOf('export function useIsMobile()');
    const fnBody = src.slice(fnStart, src.indexOf('export function useIsSmallMobile'));

    // Must use useState(false) for hydration safety
    expect(fnBody).toMatch(/useState\(false\)/);
    // Must NOT use a lazy initializer that reads window at SSR time
    expect(fnBody).not.toMatch(/useState\(\s*\(\)\s*=>/);
  });

  it('useIsSmallMobile initializes with useState(false) for hydration safety', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useIsMobile.ts'), 'utf-8');

    const fnStart = src.indexOf('export function useIsSmallMobile()');
    const fnBody = src.slice(fnStart);

    expect(fnBody).toMatch(/useState\(false\)/);
    expect(fnBody).not.toMatch(/useState\(\s*\(\)\s*=>/);
  });
});

// ---------------------------------------------------------------------------
// Fix 2: ProviderDetailPageClient uses CSS visibility, not useIsMobile branching
// ---------------------------------------------------------------------------
describe('ProviderDetailPageClient CSS visibility pattern', () => {
  const readClientSrc = () =>
    readFileSync(
      resolve(__dirname, '../../app/(public)/p/[id]/ProviderDetailPageClient.tsx'),
      'utf-8',
    );

  it('does not import useIsMobile', () => {
    const src = readClientSrc();
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('renders both mobile and desktop components with CSS visibility classes', () => {
    const src = readClientSrc();

    // Mobile wrapper: visible below md, hidden at md+
    expect(src).toContain('className="md:hidden"');
    // Desktop wrapper: hidden below md, visible at md+
    expect(src).toContain('className="hidden md:block"');

    // Both components are rendered (not conditionally branched)
    expect(src).toContain('ProviderDetailPageComponent');
    expect(src).toContain('ProviderDetailModal');
  });

  it('ProviderDetailPageComponent (mobile) dynamic import does not set ssr:false', () => {
    const src = readClientSrc();

    const mobileBlock = src.slice(
      src.indexOf("import('@/features/providers/pages/ProviderDetailPage')"),
    );

    const blockEnd = mobileBlock.indexOf(');');
    const mobileDynamicBlock = mobileBlock.slice(0, blockEnd);

    expect(mobileDynamicBlock).not.toContain('ssr: false');
  });

  it('ProviderDetailModal (desktop) dynamic import still has ssr:false', () => {
    const src = readClientSrc();

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
