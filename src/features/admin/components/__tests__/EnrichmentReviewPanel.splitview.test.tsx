// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { EnrichmentReviewPanel } from '../EnrichmentReviewPanel';
import { ar } from '@/translations/ar';
import { de } from '@/translations/de';
import { en } from '@/translations/en';
import { ps } from '@/translations/ps';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';

vi.mock('@/providers/LanguageProvider', async () => {
  const { en: catalogue } = await import('@/translations/en');
  return {
    useLanguage: () => ({
      t: (key: string, vars?: Record<string, string | number>) => {
        const value = key
          .split('.')
          .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], catalogue);
        const text = typeof value === 'string' ? value : key;
        return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars?.[name] ?? ''));
      },
    }),
  };
});

type Row = Record<string, unknown>;

const row = (over: Row): Row => ({
  provider_id: 'p1',
  provider_name: 'Tevhid',
  source: 'enrich-halal-compliance',
  source_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
  current_value: null,
  enriched_at: '2026-10-26T10:00:00Z',
  reviewed_at: null,
  reviewer_id: null,
  reviewer_email: null,
  evidence: null,
  ...over,
});

const pendingAlcohol = row({
  id: 'c-alcohol',
  field_name: 'no_alcohol',
  proposed_value: false,
  status: 'pending',
  evidence: {
    matched_keywords: ['Bier'],
    matched_items: ['Bier 0,5l'],
    maps_attributes: ['Serves alcohol'],
    maps_category: 'Bar',
    source_platform: 'wolt',
  },
});
const pendingPork = row({
  id: 'c-pork',
  field_name: 'no_pork',
  proposed_value: false,
  status: 'pending',
  evidence: { matched_keywords: ['Schwein'], matched_items: ['Schweinebraten'] },
});
const pendingOther = row({
  id: 'c-other',
  provider_id: 'p2',
  provider_name: 'Other Place',
  field_name: 'phone',
  proposed_value: '+49 30 1234',
  status: 'pending',
});
const autoApplied = row({
  id: 'h-auto',
  provider_name: 'Auto Place',
  provider_id: 'p3',
  field_name: 'delivery_links',
  proposed_value: [
    { platform: 'wolt', platform_url: 'https://wolt.com/x', platform_slug: 'x', is_active: true },
  ],
  status: 'auto-applied',
});
const applied = row({
  id: 'h-applied',
  provider_name: 'Applied Place',
  provider_id: 'p4',
  field_name: 'no_pork',
  proposed_value: true,
  status: 'applied',
  reviewed_at: '2026-10-27T09:00:00Z',
  reviewer_email: 'admin@example.com',
});
const rejected = row({
  id: 'h-rejected',
  provider_name: 'Rejected Place',
  provider_id: 'p5',
  field_name: 'no_alcohol',
  proposed_value: false,
  status: 'rejected',
  reviewed_at: '2026-10-28T09:00:00Z',
  reviewer_email: 'mod@example.com',
});

function mockApi(pending: Row[], history: Row[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const page = (data: Row[]) => ({
    ok: true,
    json: async () => ({
      data,
      pagination: { total: data.length, limit: 50, offset: 0, hasMore: false },
    }),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'POST') return { ok: true, json: async () => ({ success: true }) };
      return page(url.includes('view=history') ? history : pending);
    }),
  );
  return calls;
}

const postedBody = (calls: { init?: RequestInit }[]) => {
  const post = calls.find((c) => c.init?.method === 'POST');
  return JSON.parse(String(post?.init?.body ?? 'null'));
};

const needsReview = () => screen.getByRole('region', { name: 'Needs review' });
const history = () => screen.getByTestId('enrichment-history');

describe('#839 enrichment tab split view', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows pending halal candidates in Needs review with their evidence', async () => {
    mockApi([pendingAlcohol, pendingPork], []);
    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(needsReview()).toBeTruthy());
    const section = within(needsReview());
    expect(section.getAllByText('Tevhid').length).toBeGreaterThan(0);
    expect(section.getByText('Bier')).toBeTruthy();
    expect(section.getByText('Bier 0,5l')).toBeTruthy();
    expect(section.getByText('Serves alcohol')).toBeTruthy();
    expect(section.getByText('Bar')).toBeTruthy();
    expect(section.getByText('wolt')).toBeTruthy();
    expect(section.getByText('Schweinebraten')).toBeTruthy();
  });

  it('shows pending non-halal candidates in Needs review without an evidence block', async () => {
    mockApi([pendingOther], []);
    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(needsReview()).toBeTruthy());
    const section = within(needsReview());
    expect(section.getByText('Other Place')).toBeTruthy();
    expect(section.getByRole('button', { name: 'Approve phone change' })).toBeTruthy();
    expect(section.queryByText('Evidence')).toBeNull();
  });

  it('shows auto-applied candidates in History, not in Needs review', async () => {
    mockApi([pendingAlcohol], [autoApplied]);
    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(within(history()).getByText('Auto Place')).toBeTruthy());
    expect(within(history()).getByText('Auto-applied')).toBeTruthy();
    expect(within(needsReview()).queryByText('Auto Place')).toBeNull();
  });

  it('shows applied and rejected candidates in History with who reviewed them and when', async () => {
    mockApi([], [applied, rejected]);
    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(within(history()).getByText('Applied Place')).toBeTruthy());
    const section = within(history());
    expect(section.getByText('Rejected Place')).toBeTruthy();
    expect(section.getByText('Applied')).toBeTruthy();
    expect(section.getByText('Rejected')).toBeTruthy();
    expect(section.getByText(/admin@example\.com/)).toBeTruthy();
    expect(section.getByText(/mod@example\.com/)).toBeTruthy();
    expect(
      section.getAllByText(new Date('2026-10-27T09:00:00Z').toLocaleDateString()),
    ).toBeTruthy();
    expect(section.queryByRole('button', { name: /approve|reject/i })).toBeNull();
  });

  it('History is collapsed by default', async () => {
    mockApi([pendingAlcohol], [autoApplied]);
    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(history()).toBeTruthy());
    const details = history() as HTMLDetailsElement;
    expect(details.tagName).toBe('DETAILS');
    expect(details.open).toBe(false);
    expect(within(details).getByText(/^History/)).toBeTruthy();
  });

  it('single-click Approve posts one approve action for that candidate', async () => {
    const calls = mockApi([pendingAlcohol], []);
    render(<EnrichmentReviewPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve no_alcohol change' }));

    await waitFor(() => expect(calls.some((c) => c.init?.method === 'POST')).toBe(true));
    expect(postedBody(calls)).toMatchObject({
      action: 'approve',
      candidateId: 'c-alcohol',
    });
  });

  it('Reject posts a reject action for that candidate', async () => {
    const calls = mockApi([pendingAlcohol], []);
    render(<EnrichmentReviewPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject no_alcohol change' }));

    await waitFor(() => expect(calls.some((c) => c.init?.method === 'POST')).toBe(true));
    expect(postedBody(calls)).toMatchObject({
      action: 'reject',
      candidateId: 'c-alcohol',
    });
  });

  it('bulk Approve all works per provider', async () => {
    const calls = mockApi([pendingAlcohol, pendingPork, pendingOther], []);
    render(<EnrichmentReviewPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve all (2)' }));

    await waitFor(() => expect(calls.some((c) => c.init?.method === 'POST')).toBe(true));
    expect(postedBody(calls)).toMatchObject({
      action: 'bulk-approve',
      providerId: 'p1',
    });
    expect(screen.getByRole('button', { name: 'Approve all (1)' })).toBeTruthy();
  });

  it('requests pending and history lists, scoped to the provider when one is given', async () => {
    const calls = mockApi([pendingAlcohol], [autoApplied]);
    render(<EnrichmentReviewPanel providerId="p1" />);

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));
    const urls = calls.map((c) => c.url);
    expect(urls.some((u) => u.includes('view=history') && u.includes('providerId=p1'))).toBe(true);
    expect(urls.some((u) => !u.includes('view=history') && u.includes('providerId=p1'))).toBe(true);
  });

  it('shows a loading error state with retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })),
    );
    render(<EnrichmentReviewPanel />);

    expect(await screen.findByText(/boom/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows an empty state when there is nothing pending and no history', async () => {
    mockApi([], []);
    render(<EnrichmentReviewPanel />);

    expect(await screen.findByText('Nothing needs review.')).toBeTruthy();
  });

  it('has the enrichment keys in all six locales', () => {
    const keys = ['needsReview', 'history', 'approveAll', 'evidence', 'autoApplied'];
    const catalogues = { en, de, ar, tr, ur, ps } as unknown as Record<
      string,
      { admin?: { enrichment?: Record<string, string> } }
    >;
    for (const [locale, catalogue] of Object.entries(catalogues)) {
      for (const key of keys) {
        expect(
          catalogue.admin?.enrichment?.[key],
          `${locale}.admin.enrichment.${key}`,
        ).toBeTruthy();
      }
    }
  });
});
