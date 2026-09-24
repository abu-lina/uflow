// @vitest-environment jsdom
/**
 * Plan 248: Mobile page transition flash
 *
 * Root causes addressed:
 * 1. useIsMobile must stay hydration-safe (useState(false)) so server and
 *    client initial renders match.
 * 2. ProviderDetailPageComponent uses SSR (no ssr:false) so Next.js renders
 *    real content server-side instead of a skeleton fallback. The desktop
 *    modal is JS-gated via matchMedia (not CSS hidden/block) because
 *    createPortal to document.body escapes CSS visibility wrappers.
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
// Fix 2: ProviderDetailPageClient layout strategy
// Mobile component uses CSS visibility (md:hidden). Desktop modal is JS-gated
// via matchMedia to prevent portal escape (createPortal to document.body
// bypasses CSS hidden/block).
// ---------------------------------------------------------------------------
describe('ProviderDetailPageClient layout strategy', () => {
  const readClientSrc = () =>
    readFileSync(
      resolve(__dirname, '../../app/(public)/p/[id]/ProviderDetailPageClient.tsx'),
      'utf-8',
    );

  it('does not import useIsMobile', () => {
    const src = readClientSrc();
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('mobile component is wrapped with CSS md:hidden', () => {
    const src = readClientSrc();
    expect(src).toContain('className="md:hidden"');
    expect(src).toContain('ProviderDetailPageComponent');
  });

  it('desktop modal is JS-gated with matchMedia, not CSS hidden/block', () => {
    const src = readClientSrc();

    // Must use matchMedia to gate the modal mount
    expect(src).toContain("matchMedia('(min-width: 768px)')");
    expect(src).toContain('showDesktopModal');

    // Must NOT wrap modal in a CSS-hidden div (portal escapes it)
    expect(src).not.toContain('className="hidden md:block"');

    // Modal is conditionally rendered via JS
    expect(src).toMatch(/\{showDesktopModal\s*&&/);
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
