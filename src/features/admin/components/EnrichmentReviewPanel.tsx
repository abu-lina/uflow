'use client';

import { useState, useEffect, useCallback, useId } from 'react';

import { DeliveryLinks } from '@/features/admin/components/DeliveryLinks';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * EnrichmentReviewPanel — ADR 0003 split view.
 *
 * "Needs review": all pending candidates grouped by provider, with the
 * pipeline's evidence for compliance candidates and approve/reject/bulk-approve.
 * "History" (collapsed): read-only audit trail of auto-applied, applied and
 * rejected candidates.
 */

type Evidence = Record<string, unknown>;

interface EnrichmentCandidate {
  id: string;
  provider_id: string;
  provider_name: string;
  source: string;
  source_url: string | null;
  field_name: string;
  proposed_value: unknown;
  current_value: unknown;
  evidence?: Evidence | null;
  status: string;
  enriched_at: string;
  reviewed_at?: string | null;
  reviewer_email?: string | null;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

type View = 'pending' | 'history';

interface CandidateList {
  items: EnrichmentCandidate[];
  pagination: PaginationInfo | null;
}

const EMPTY_LIST: CandidateList = { items: [], pagination: null };
const PAGE_SIZE = 50;

interface EnrichmentReviewPanelProps {
  /** When set, filters candidates to a single provider */
  providerId?: string;
}

const STATUS_KEYS: Record<string, string> = {
  'auto-applied': 'autoApplied',
  applied: 'applied',
  rejected: 'rejected',
  approved: 'approved',
};

const STATUS_STYLES: Record<string, string> = {
  'auto-applied': 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
};

export function EnrichmentReviewPanel({ providerId }: EnrichmentReviewPanelProps) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<CandidateList>(EMPTY_LIST);
  const [history, setHistory] = useState<CandidateList>(EMPTY_LIST);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const needsReviewId = useId();

  const fetchPage = useCallback(
    async (view: View, offset: number): Promise<CandidateList> => {
      const queryParams = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (view === 'history') queryParams.set('view', 'history');
      if (providerId) queryParams.set('providerId', providerId);
      const res = await fetch(`/api/admin/enrichment/candidates?${queryParams}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return { items: json.data ?? [], pagination: json.pagination ?? null };
    },
    [providerId],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPending, nextHistory] = await Promise.all([
        fetchPage('pending', 0),
        fetchPage('history', 0),
      ]);
      setPending(nextPending);
      setHistory(nextHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loadMore = async (view: View) => {
    const current = view === 'pending' ? pending : history;
    const setList = view === 'pending' ? setPending : setHistory;
    try {
      const next = await fetchPage(view, current.items.length);
      setList({ items: [...current.items, ...next.items], pagination: next.pagination });
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    }
  };

  const handleAction = async (
    action: 'approve' | 'reject' | 'bulk-approve',
    target: { candidateId?: string; providerId?: string },
  ) => {
    setActionLoading(target.candidateId ?? target.providerId ?? action);
    try {
      const res = await fetch('/api/admin/enrichment/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    } finally {
      setActionLoading(null);
    }
  };

  const grouped = Object.values(
    pending.items.reduce<
      Record<
        string,
        { provider_name: string; provider_id: string; candidates: EnrichmentCandidate[] }
      >
    >((acc, c) => {
      (acc[c.provider_id] ??= {
        provider_name: c.provider_name,
        provider_id: c.provider_id,
        candidates: [],
      }).candidates.push(c);
      return acc;
    }, {}),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2 text-sm text-gray-500">{t('admin.enrichment.loading')}</span>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {t('admin.enrichment.error', { message: error || t('admin.enrichment.loadFailed') })}
        </p>
        <button
          className="mt-2 text-sm text-red-600 underline"
          type="button"
          onClick={() => fetchAll()}
        >
          {t('admin.enrichment.retry')}
        </button>
      </div>
    );
  }

  const pendingTotal = pending.pagination?.total ?? pending.items.length;
  const historyTotal = history.pagination?.total ?? history.items.length;

  return (
    <div className="space-y-6">
      <section aria-labelledby={needsReviewId} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" id={needsReviewId}>
            {t('admin.enrichment.needsReview')}
          </h2>
          {pendingTotal > 0 && (
            <span className="text-sm text-gray-500">
              {t('admin.enrichment.pendingCount', { count: pendingTotal })}
            </span>
          )}
        </div>

        {grouped.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">{t('admin.enrichment.nothingNeedsReview')}</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.provider_id} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="font-medium text-gray-900">{group.provider_name}</h3>
              <button
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                disabled={actionLoading !== null}
                type="button"
                onClick={() => handleAction('bulk-approve', { providerId: group.provider_id })}
              >
                {actionLoading === group.provider_id
                  ? t('admin.enrichment.approving')
                  : t('admin.enrichment.approveAll', { count: group.candidates.length })}
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {group.candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-start gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {candidate.field_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {candidate.source} · {new Date(candidate.enriched_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CandidateValues candidate={candidate} />
                    <EvidenceBlock evidence={candidate.evidence} />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      aria-label={t('admin.enrichment.approveAria', {
                        field: candidate.field_name,
                      })}
                      className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                      disabled={actionLoading !== null}
                      type="button"
                      onClick={() => handleAction('approve', { candidateId: candidate.id })}
                    >
                      {actionLoading === candidate.id ? '...' : t('admin.enrichment.approve')}
                    </button>
                    <button
                      aria-label={t('admin.enrichment.rejectAria', { field: candidate.field_name })}
                      className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                      disabled={actionLoading !== null}
                      type="button"
                      onClick={() => handleAction('reject', { candidateId: candidate.id })}
                    >
                      {actionLoading === candidate.id ? '...' : t('admin.enrichment.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {pending.pagination?.hasMore && (
          <div className="text-center">
            <button
              className="text-sm text-primary underline"
              type="button"
              onClick={() => loadMore('pending')}
            >
              {t('admin.enrichment.loadMore')}
            </button>
          </div>
        )}
      </section>

      <details
        className="rounded-lg border border-gray-200 bg-white"
        data-testid="enrichment-history"
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900">
          <span>{t('admin.enrichment.history')}</span>{' '}
          <span className="text-gray-500">({historyTotal})</span>
        </summary>

        {history.items.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-500">{t('admin.enrichment.historyEmpty')}</p>
        ) : (
          <ul className="divide-y divide-gray-50 border-t border-gray-100">
            {history.items.map((candidate) => (
              <HistoryRow key={candidate.id} candidate={candidate} />
            ))}
          </ul>
        )}

        {history.pagination?.hasMore && (
          <div className="p-4 text-center">
            <button
              className="text-sm text-primary underline"
              type="button"
              onClick={() => loadMore('history')}
            >
              {t('admin.enrichment.loadMore')}
            </button>
          </div>
        )}
      </details>
    </div>
  );
}

function CandidateValues({ candidate }: { candidate: EnrichmentCandidate }) {
  const { t } = useLanguage();
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-xs text-gray-400">{t('admin.enrichment.current')}:</span>
        <div className="font-mono text-xs text-gray-600">
          {formatValue(candidate.current_value)}
        </div>
      </div>
      <div>
        <span className="text-xs text-gray-400">{t('admin.enrichment.proposed')}:</span>
        {candidate.field_name === 'delivery_links' ? (
          <DeliveryLinks sourceUrl={candidate.source_url} value={candidate.proposed_value} />
        ) : (
          <div className="font-mono text-xs text-green-700">
            {formatValue(candidate.proposed_value)}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ candidate }: { candidate: EnrichmentCandidate }) {
  const { t } = useLanguage();
  const statusKey = STATUS_KEYS[candidate.status];
  const reviewedBy =
    candidate.status === 'auto-applied'
      ? t('admin.enrichment.byPipeline')
      : t('admin.enrichment.reviewedBy', {
          reviewer: candidate.reviewer_email ?? t('admin.enrichment.unknownReviewer'),
        });

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-900">{candidate.provider_name}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {candidate.field_name}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[candidate.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {statusKey ? t(`admin.enrichment.${statusKey}`) : candidate.status}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(candidate.reviewed_at ?? candidate.enriched_at).toLocaleDateString()}
        </span>
        <span className="text-xs text-gray-400">{reviewedBy}</span>
      </div>
      <CandidateValues candidate={candidate} />
      <EvidenceBlock evidence={candidate.evidence} />
    </li>
  );
}

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : [];

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

function EvidenceBlock({ evidence }: { evidence?: Evidence | null }) {
  const { t } = useLanguage();
  if (!evidence) return null;

  const lists = [
    ['matchedKeywords', asStrings(evidence.matched_keywords)],
    ['matchedItems', asStrings(evidence.matched_items)],
    ['mapsAttributes', asStrings(evidence.maps_attributes)],
  ] as const;
  const singles = [
    ['mapsCategory', asString(evidence.maps_category)],
    ['sourcePlatform', asString(evidence.source_platform)],
  ] as const;

  const shownLists = lists.filter(([, values]) => values.length > 0);
  const shownSingles = singles.filter(([, value]) => value !== null);
  if (shownLists.length === 0 && shownSingles.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
      <div className="mb-1 font-medium text-amber-900">{t('admin.enrichment.evidence')}</div>
      <dl className="space-y-1">
        {shownLists.map(([key, values]) => (
          <div key={key} className="flex flex-wrap items-center gap-1">
            <dt className="text-gray-500">{t(`admin.enrichment.${key}`)}:</dt>
            <dd>
              <ul className="flex flex-wrap gap-1">
                {values.map((value) => (
                  <li key={value} className="rounded bg-white px-1.5 py-0.5 text-gray-800">
                    {value}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
        {shownSingles.map(([key, value]) => (
          <div key={key} className="flex flex-wrap items-center gap-1">
            <dt className="text-gray-500">{t(`admin.enrichment.${key}`)}:</dt>
            <dd>
              <span className="text-gray-800">{value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.length} items]`;
  }
  return String(value);
}
