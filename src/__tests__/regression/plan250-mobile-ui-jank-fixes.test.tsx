// @vitest-environment node
/**
 * Plan 250: Mobile UI jank fixes
 *
 * Root cause: useIsMobile / useIsSmallMobile hooks initialize as false during
 * SSR, causing a flash when the client hydrates and flips to true. This task
 * replaces JS-based mobile detection with CSS-based responsive toggling
 * (md:hidden / hidden md:block, Tailwind responsive classes) across all
 * affected pages.
 *
 * These source-level tests verify each file no longer imports the hooks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const read = (relPath: string) => readFileSync(resolve(__dirname, '../..', relPath), 'utf-8');

// ---------------------------------------------------------------------------
// 1. CommunityServiceDetailPageClient
// ---------------------------------------------------------------------------
describe('CommunityServiceDetailPageClient removes useIsMobile', () => {
  const src = read(
    'app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient.tsx',
  );

  it('does not import useIsMobile', () => {
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('uses CSS md:hidden / hidden md:flex for mobile/desktop toggling', () => {
    expect(src).toContain('md:hidden');
  });
});

// ---------------------------------------------------------------------------
// 2. ProfileProviderDetailPage
// ---------------------------------------------------------------------------
describe('ProfileProviderDetailPage removes useIsMobile', () => {
  const src = read('features/providers/pages/ProfileProviderDetailPage.tsx');

  it('does not import useIsMobile', () => {
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('uses CSS md:hidden for mobile content', () => {
    expect(src).toContain('md:hidden');
  });
});

// ---------------------------------------------------------------------------
// 3. ProfileProviderDetailButtons
// ---------------------------------------------------------------------------
describe('ProfileProviderDetailButtons removes useIsMobile', () => {
  const src = read('features/providers/pages/ProfileProviderDetailButtons.tsx');

  it('does not import useIsMobile', () => {
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('uses matchMedia JS gating for mobile/desktop toggling (portals escape CSS wrappers)', () => {
    expect(src).toContain("matchMedia('(min-width: 768px)')");
    expect(src).toContain('isDesktop');
  });
});

// ---------------------------------------------------------------------------
// 4. ProfileContent
// ---------------------------------------------------------------------------
describe('ProfileContent removes useIsSmallMobile', () => {
  const src = read('app/(public)/profile/ProfileContent.tsx');

  it('does not import useIsSmallMobile', () => {
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('uses CSS sm:hidden / hidden sm:block for toggling', () => {
    expect(src).toContain('sm:hidden');
    expect(src).toContain('hidden sm:block');
  });
});

// ---------------------------------------------------------------------------
// 5. create/* pages use ScrollablePageLayout, not DesktopCreateLayout
// ---------------------------------------------------------------------------
describe('create/* pages consolidated to ScrollablePageLayout', () => {
  const createPages = [
    'app/(public)/create/page.tsx',
    'app/(public)/create/basics/page.tsx',
    'app/(public)/create/basics/category/page.tsx',
    'app/(public)/create/basics/offers/page.tsx',
    'app/(public)/create/basics/needs/page.tsx',
    'app/(public)/create/contact/page.tsx',
    'app/(public)/create/halal/page.tsx',
    'app/(public)/create/location/page.tsx',
    'app/(public)/create/media/page.tsx',
    'app/(public)/create/media/images/page.tsx',
    'app/(public)/create/media/social/page.tsx',
    'app/(public)/create/recommend/page.tsx',
    'app/(public)/create/recommend/category/page.tsx',
    'app/(public)/create/recommend/offers/page.tsx',
    'app/(public)/create/import-osm/page.tsx',
    'app/(public)/create/social-category/page.tsx',
  ];

  for (const page of createPages) {
    it(`${page} does not import useIsSmallMobile`, () => {
      const src = read(page);
      expect(src).not.toContain("from '@/hooks/useIsMobile'");
    });

    it(`${page} does not import DesktopCreateLayout`, () => {
      const src = read(page);
      expect(src).not.toContain('DesktopCreateLayout');
    });

    it(`${page} uses ScrollablePageLayout`, () => {
      const src = read(page);
      expect(src).toContain('ScrollablePageLayout');
    });
  }
});

// ---------------------------------------------------------------------------
// 6. DiscoveryResultsGrid
// ---------------------------------------------------------------------------
describe('DiscoveryResultsGrid removes useIsMobile', () => {
  const src = read('features/search/components/DiscoveryResultsGrid.tsx');

  it('does not import useIsMobile', () => {
    expect(src).not.toContain("from '@/hooks/useIsMobile'");
  });

  it('uses md:!pt-0 to reset paddingTop on desktop', () => {
    expect(src).toContain('md:!pt-0');
  });

  it('uses md:!pb-0 to reset paddingBottom on desktop', () => {
    expect(src).toContain('md:!pb-0');
  });
});

// ---------------------------------------------------------------------------
// 7. Dead code deleted
// ---------------------------------------------------------------------------
describe('Dead code removed', () => {
  it('MobileLayoutWrapper.tsx is deleted', () => {
    const exists = existsSync(
      resolve(__dirname, '../../components/layout/MobileLayoutWrapper.tsx'),
    );
    expect(exists).toBe(false);
  });

  it('DesktopCreateLayout.tsx is deleted', () => {
    const exists = existsSync(
      resolve(__dirname, '../../components/layout/DesktopCreateLayout.tsx'),
    );
    expect(exists).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Legal pages
// ---------------------------------------------------------------------------
describe('Legal pages remove useIsSmallMobile', () => {
  const legalPages = [
    'app/(public)/privacy-policy/PrivacyPolicyContent.tsx',
    'app/(public)/terms/TermsOfServiceContent.tsx',
    'app/(public)/impressum/ImpressumContent.tsx',
  ];

  for (const page of legalPages) {
    it(`${page} does not import useIsSmallMobile`, () => {
      const src = read(page);
      expect(src).not.toContain("from '@/hooks/useIsMobile'");
    });
  }
});
