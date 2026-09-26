// @vitest-environment jsdom
/**
 * Plan 255 C5 (#415): success screen provisional seal, awaiting-review
 * messaging, and profile pending badge.
 *
 * - All-NULL ("not sure") attestations earn no tier and render no seal and no
 *   seal-shaped placeholder on the success screen.
 * - An earned tier renders the seal labelled provisional.
 * - Both flows tell the submitter the entry is awaiting review.
 * - A pending submission shows a pending badge in Profile for its creator.
 * - getRecommendations/getCreatedProviders do not filter on review_status so
 *   the widened RLS policy (migration 130) actually returns pending rows.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ alt, src, onError: _onError, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-src={src} {...props} />
  ),
}));

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get:
        () =>
        ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
  ),
}));

vi.mock('@/components/shared/PWAInstallCTA', () => ({
  PWAInstallCTA: () => null,
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/useOptimisticBookmark', () => ({
  useOptimisticBookmark: () => ({ handleBookmark: vi.fn() }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

import { RecommendSuccessScreen } from '@/components/shared/RecommendSuccessScreen';
import { ProofTierCard } from '@/features/providers/components/ProofTierCard';
import { MobileProfileProviderCard } from '@/components/shared/MobileProfileProviderCard';
import { SelectableCard } from '@/components/shared/SelectableCard';

const noop = () => {};

describe('255 C5 — success screen provisional seal', () => {
  it('all-NULL attestations render no seal and no placeholder', () => {
    const { container } = render(
      <RecommendSuccessScreen
        seal={{
          verificationMethod: 'online',
          hasCertificate: false,
          noAlcohol: null,
          noPork: null,
          noGambling: null,
        }}
        onGoBack={noop}
        onRecommendAnother={noop}
      />,
    );
    expect(screen.queryByText('submissionStatus.provisionalSeal')).not.toBeInTheDocument();
    expect(container.querySelector('img[data-src*="seals-"]')).toBeNull();
  });

  it('no seal prop renders no seal at all', () => {
    const { container } = render(
      <RecommendSuccessScreen onGoBack={noop} onRecommendAnother={noop} />,
    );
    expect(container.querySelector('img[data-src*="seals-"]')).toBeNull();
    expect(screen.queryByText('submissionStatus.provisionalSeal')).not.toBeInTheDocument();
  });

  it('an earned tier renders the seal labelled provisional', () => {
    render(
      <RecommendSuccessScreen
        seal={{
          verificationMethod: 'online',
          hasCertificate: false,
          noAlcohol: true,
          noPork: null,
          noGambling: null,
        }}
        onGoBack={noop}
        onRecommendAnother={noop}
      />,
    );
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
    expect(screen.getByText('submissionStatus.provisionalSeal')).toBeInTheDocument();
  });

  it('always shows the awaiting-review message', () => {
    render(<RecommendSuccessScreen onGoBack={noop} onRecommendAnother={noop} />);
    expect(screen.getByText('submissionStatus.awaitingReview')).toBeInTheDocument();
  });

  it('ProofTierCard provisional renders the seal plus provisional label', () => {
    render(
      <ProofTierCard
        provisional
        hasCertificate={false}
        noAlcohol={true}
        verificationMethod="online"
      />,
    );
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
    expect(screen.getByText('submissionStatus.provisionalSeal')).toBeInTheDocument();
  });

  it('ProofTierCard provisional renders nothing when no tier is earned', () => {
    const { container } = render(
      <ProofTierCard
        provisional
        hasCertificate={false}
        noAlcohol={null}
        noGambling={null}
        noPork={null}
        verificationMethod="online"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('255 C5 — awaiting review in the owner flow', () => {
  it('media page success toast uses the awaiting-review copy', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../app/(public)/create/media/page.tsx'),
      'utf8',
    );
    expect(src).toContain("t('submissionStatus.submittedToast')");
    expect(src).not.toContain('providerCreated');
    expect(src).not.toContain('communityServiceCreated');
  });
});

describe('255 C5 — profile pending badge', () => {
  it('MobileProfileProviderCard renders the status badge when provided', () => {
    render(
      <MobileProfileProviderCard
        category="Restaurant"
        imageUrl="/x.png"
        likes={0}
        statusBadge="submissionStatus.pendingBadge"
        title="Test Provider"
      />,
    );
    expect(screen.getByText('submissionStatus.pendingBadge')).toBeInTheDocument();
  });

  it('MobileProfileProviderCard renders no badge without the prop', () => {
    render(
      <MobileProfileProviderCard category="Restaurant" imageUrl="/x.png" likes={0} title="Test" />,
    );
    expect(screen.queryByText('submissionStatus.pendingBadge')).not.toBeInTheDocument();
  });

  it('SelectableCard renders the status badge when provided', () => {
    render(
      <SelectableCard imageUrl="/x.png" statusBadge="submissionStatus.pendingBadge" title="Test" />,
    );
    expect(screen.getByText('submissionStatus.pendingBadge')).toBeInTheDocument();
  });

  it('ProfileContent passes the pending badge for pending rows in all four lists', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../app/(public)/profile/ProfileContent.tsx'),
      'utf8',
    );
    const matches = src.match(/provider\.review_status === 'pending'/g) ?? [];
    expect(matches.length).toBe(4);
    expect(src).toContain("t('submissionStatus.pendingBadge')");
  });
});

describe('255 C5 — queries return pending rows for their creator', () => {
  const crudSrc = fs.readFileSync(
    path.resolve(__dirname, '../../services/providers/crud.ts'),
    'utf8',
  );

  const bodyOf = (name: string) => {
    const start = crudSrc.indexOf(`export async function ${name}`);
    const end = crudSrc.indexOf('export async function', start + 1);
    return crudSrc.slice(start, end === -1 ? undefined : end);
  };

  it('getRecommendations does not filter on review_status', () => {
    const body = bodyOf('getRecommendations');
    expect(body).toContain(".eq('user_created_id', userId)");
    expect(body).not.toContain('review_status');
  });

  it('getCreatedProviders does not filter on review_status', () => {
    const body = bodyOf('getCreatedProviders');
    expect(body).toContain(".eq('provider_owner_id', userId)");
    expect(body).not.toContain('review_status');
  });
});

describe('255 C5 — no seal leaks mid-flow', () => {
  const flowFiles = [
    'app/(public)/create/basics/page.tsx',
    'app/(public)/create/location/page.tsx',
    'app/(public)/create/contact/page.tsx',
    'app/(public)/create/halal/page.tsx',
    'app/(public)/create/media/page.tsx',
    'features/providers/StreamlinedRecommendForm.tsx',
    'features/providers/StreamlinedImportForm.tsx',
  ];

  it.each(flowFiles)('%s contains no seal/tier rendering', (file) => {
    const src = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
    expect(src).not.toContain('ProofTierCard');
    expect(src).not.toContain('computeSealTier');
    expect(src).not.toContain('sealAlt');
    expect(src).not.toContain('computeHalalStars');
  });
});
