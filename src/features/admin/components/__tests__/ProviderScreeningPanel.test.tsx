// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { ProviderScreeningPanel, ProviderScreeningPanelSkeleton } from '../ProviderScreeningPanel';
import type {
  ProviderScreeningsResult,
  ScreeningFlag,
} from '@/features/admin/utils/provider-screenings';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  }),
}));

const K = 'adminScreening';

const flag = (over: Partial<ScreeningFlag> = {}): ScreeningFlag => ({
  code: 'alcohol',
  term: 'bier',
  snippet: 'Frisches Bier vom Fass',
  url: 'https://example.com/menu',
  source: 'menu',
  ...over,
});

type Ready = Extract<ProviderScreeningsResult, { state: 'ready' }>;

const ready = (over: Partial<Ready> = {}): Ready => ({
  state: 'ready',
  status: 'flagged',
  risks: [flag()],
  positives: [],
  ...over,
});

describe('ProviderScreeningPanel (#766)', () => {
  it.each([
    ['flagged', 'red'],
    ['review', 'amber'],
    ['clear', 'green'],
  ] as const)('AC1: %s status renders a %s traffic light', (status, colour) => {
    render(<ProviderScreeningPanel result={ready({ status, risks: [] })} />);
    const badge = screen.getByTestId('screening-status');
    expect(badge).toHaveTextContent(`${K}.status.${status}`);
    expect(badge).toHaveAttribute('data-status', status);
    expect(badge.className).toContain(colour === 'amber' ? 'amber' : colour);
  });

  it('AC2: each flag shows code, term, snippet, source and an evidence link', () => {
    render(<ProviderScreeningPanel result={ready()} />);
    const item = screen.getByTestId('screening-risk-flag');
    expect(within(item).getByText(`${K}.code.alcohol`)).toBeInTheDocument();
    expect(within(item).getByText('bier')).toBeInTheDocument();
    expect(within(item).getByText(/Frisches Bier vom Fass/)).toBeInTheDocument();
    expect(within(item).getByText(`${K}.source.menu`)).toBeInTheDocument();
    const link = within(item).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/menu');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('AC2: an evidence url with a non-http scheme is not rendered as a link', () => {
    render(
      <ProviderScreeningPanel result={ready({ risks: [flag({ url: 'javascript:alert(1)' })] })} />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('AC3: positive signals render in their own section, apart from risk flags', () => {
    render(
      <ProviderScreeningPanel
        result={ready({
          status: 'review',
          risks: [flag({ code: 'not_halal', term: 'nicht halal' })],
          positives: [flag({ code: 'halal_positive', term: 'halal' })],
        })}
      />,
    );
    const risks = screen.getByTestId('screening-risks');
    const positives = screen.getByTestId('screening-positives');
    expect(within(risks).getByText('nicht halal')).toBeInTheDocument();
    expect(within(risks).queryByText('halal')).not.toBeInTheDocument();
    expect(within(positives).getByText('halal')).toBeInTheDocument();
    expect(screen.getByTestId('screening-status')).toHaveAttribute('data-status', 'review');
  });

  it('AC3: positives alone with a review status stay amber', () => {
    render(
      <ProviderScreeningPanel
        result={ready({
          status: 'review',
          risks: [],
          positives: [flag({ code: 'halal_positive', term: 'halal' })],
        })}
      />,
    );
    expect(screen.getByTestId('screening-status')).toHaveAttribute('data-status', 'review');
  });

  it('AC4: empty state says the provider is not screened yet', () => {
    render(<ProviderScreeningPanel result={{ state: 'empty' }} />);
    expect(screen.getByText(`${K}.empty`)).toBeInTheDocument();
    expect(screen.queryByTestId('screening-status')).not.toBeInTheDocument();
  });

  it('AC4: error state renders an alert', () => {
    render(<ProviderScreeningPanel result={{ state: 'error' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`${K}.error`);
  });

  it('AC4: skeleton renders a loading placeholder', () => {
    render(<ProviderScreeningPanelSkeleton />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('AC5: forbidden result renders nothing', () => {
    const { container } = render(<ProviderScreeningPanel result={{ state: 'forbidden' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('AC6: snippets are rendered as text, never as HTML', () => {
    const snippet = '<img src=x onerror=alert(1)><b>bold</b>';
    const { container } = render(
      <ProviderScreeningPanel result={ready({ risks: [flag({ snippet })] })} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText(new RegExp('<img src=x onerror=alert\\(1\\)>'))).toBeInTheDocument();
  });

  it('AC7: uses a labelled section with a heading and a list of flags', () => {
    render(<ProviderScreeningPanel result={ready()} />);
    expect(screen.getByRole('region')).toHaveAccessibleName(`${K}.title`);
    expect(screen.getByRole('heading', { name: `${K}.title` })).toBeInTheDocument();
    expect(within(screen.getByTestId('screening-risks')).getByRole('list')).toBeInTheDocument();
  });
});
