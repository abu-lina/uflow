// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContent } from '@/components/layout/PageContent';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, '../..', relativePath), 'utf-8');

const loadingBranches = [
  { page: 'app/(public)/create/basics/page.tsx', marker: 'if (isLoading) {' },
  { page: 'app/(public)/create/contact/page.tsx', marker: 'if (isLoading) {' },
  { page: 'app/(public)/create/contact/page.tsx', marker: 'if (isRecommendationMode) {' },
  { page: 'app/(public)/create/halal/page.tsx', marker: 'if (isLoading)' },
  { page: 'app/(public)/create/location/page.tsx', marker: 'if (isLoading) {' },
  { page: 'app/(public)/create/media/page.tsx', marker: 'if (isLoading) {' },
];

describe('Plan 265 create desktop layout', () => {
  it('[post-fix PASSES] opted-in shell keeps the page header in flow and aligns content below it', () => {
    const { container } = render(
      <ScrollablePageLayout createDesktopLayout>
        <PageHeader title="Create" variant="back-and-title" onBack="/" />
        <PageContent maxWidth="full">
          <p>Content</p>
        </PageContent>
      </ScrollablePageLayout>,
    );

    const header = container.querySelector('header');
    const main = container.querySelector('main');
    const content = main?.firstElementChild;

    expect(header).toHaveClass('md:static');
    expect(header).toHaveClass('md:!mx-auto');
    expect(header).toHaveClass('md:pt-[calc(var(--desktop-header-height,256px)_+_16px)]');
    expect(main).toHaveClass('md:pt-4');
    expect(main).not.toHaveClass('md:items-center');
    expect(main).toHaveClass('md:mx-auto', 'md:w-full', 'md:max-w-2xl');
    expect(content).toHaveClass('md:!mx-auto', 'md:!w-full', 'md:!max-w-2xl');
    expect(screen.getByRole('heading', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
  });

  it('leaves shared layout defaults unchanged when the create opt-in is omitted', () => {
    const { container } = render(
      <ScrollablePageLayout>
        <PageHeader title="Other page" />
        <PageContent>
          <p>Content</p>
        </PageContent>
      </ScrollablePageLayout>,
    );

    expect(container.querySelector('header')).not.toHaveClass('md:static');
    expect(container.querySelector('main')).toHaveClass(
      'md:pt-[calc(env(safe-area-inset-top)+104px)]',
    );
  });

  for (const page of createPages) {
    it(`${page} opts into the create desktop layout`, () => {
      const source = readSource(page);
      const layouts = Array.from(source.matchAll(/<ScrollablePageLayout\b[^>]*>/g));

      expect(source).toContain('ScrollablePageLayout');
      expect(layouts.length).toBeGreaterThan(0);

      for (const layout of layouts) {
        expect(layout[0]).toContain('createDesktopLayout');
      }

      for (const loginGate of Array.from(source.matchAll(/<LoginGate\b[^>]*\/>/g))) {
        expect(loginGate[0]).toContain('createDesktopLayout');
      }
    });
  }

  it('LoginGate applies the opted-in create layout to its header and content', () => {
    const source = readSource('components/shared/LoginGate.tsx');

    expect(source).toContain('createDesktopLayout?: boolean');
    expect(source).toContain('<ScrollablePageLayout createDesktopLayout={createDesktopLayout}>');
  });

  for (const { page, marker } of loadingBranches) {
    it(`${page} wraps ${marker} in the create desktop layout`, () => {
      const source = readSource(page);
      const start = source.indexOf(marker);
      const end = source.indexOf('\n  }', start);
      const branch = source.slice(start, end);

      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      expect(branch).toContain('<ScrollablePageLayout createDesktopLayout>');
      expect(branch).toMatch(/<PageHeader\s+className="hidden md:block"/);
    });
  }

  for (const page of [
    'app/(public)/create/recommend/page.tsx',
    'app/(public)/create/import-osm/page.tsx',
  ]) {
    it(`${page} retains a desktop page header in the success state`, () => {
      const source = readSource(page);

      expect(source).not.toContain('{!showSuccessScreen && (');
      expect(source).toContain('hidden md:block');
    });
  }

  it('social-category uses translated title and media loading contains desktop column classes', () => {
    const socialSource = readSource('app/(public)/create/social-category/page.tsx');
    expect(socialSource).not.toContain('title="Kategorie auswählen"');
    expect(socialSource).toContain("t('providers.selectCategory')");

    const mediaSource = readSource('app/(public)/create/media/page.tsx');
    expect(mediaSource).toContain('md:max-w-2xl');
    expect(mediaSource).toContain('md:mx-auto');
  });
});
