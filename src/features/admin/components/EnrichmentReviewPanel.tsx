'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * EnrichmentReviewPanel — Plan 065, Milestone 3
 *
 * Client component for admin enrichment candidate review.
 * Displays pending enrichment candidates grouped by provider,
 * with approve/reject/bulk-approve actions.
 */

interface EnrichmentCandidate {
  id: string;
  provider_id: string;
  provider_name: string;
  source: string;
  source_url: string | null;
  field_name: string;
  proposed_value: unknown;
  current_value: unknown;
  status: string;
  enriched_at: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface EnrichmentReviewPanelProps {
  /** When set, filters candidates to a single provider */
  providerId?: string;
}

export function EnrichmentReviewPanel({ providerId }: EnrichmentReviewPanelProps) {
  const [candidates, setCandidates] = useState<EnrichmentCandidate[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCandidates = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ limit: '50', offset: String(offset) });
      if (providerId) queryParams.set('providerId', providerId);
      const res = await fetch(`/api/admin/enrichment/candidates?${queryParams}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setCandidates(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleAction = async (
    action: 'approve' | 'reject' | 'bulk-approve',
    candidateId?: string,
    providerId?: string
  ) => {
    const key = candidateId ?? providerId ?? action;
    setActionLoading(key);
    try {
      const res = await fetch('/api/admin/enrichment/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, candidateId, providerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      // Refresh list after action
      await fetchCandidates(pagination?.offset ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Group candidates by provider
  const grouped = candidates.reduce(
    (acc, c) => {
      if (!acc[c.provider_id]) {
        acc[c.provider_id] = {
          provider_name: c.provider_name,
          provider_id: c.provider_id,
          candidates: [],
        };
      }
      acc[c.provider_id].candidates.push(c);
      return acc;
    },
    {} as Record<string, { provider_name: string; provider_id: string; candidates: EnrichmentCandidate[] }>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2 text-sm text-gray-500">Loading enrichment candidates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Error: {error}</p>
        <button
          className="mt-2 text-sm text-red-600 underline"
          type="button"
          onClick={() => fetchCandidates()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">No pending enrichment candidates.</p>
        <p className="mt-1 text-xs text-gray-400">
          Run the enrichment pipeline to generate candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Enrichment Candidates ({pagination?.total ?? candidates.length} pending)
        </h2>
      </div>

      {Object.values(grouped).map((group) => (
        <div key={group.provider_id} className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="font-medium text-gray-900">{group.provider_name}</h3>
            <button
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              disabled={actionLoading !== null}
              type="button"
              onClick={() => handleAction('bulk-approve', undefined, group.provider_id)}
            >
              {actionLoading === group.provider_id ? 'Approving...' : `Approve All (${group.candidates.length})`}
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
                  <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">Current:</span>
                      <div className="font-mono text-xs text-gray-600">
                        {formatValue(candidate.current_value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Proposed:</span>
                      <div className="font-mono text-xs text-green-700">
                        {formatValue(candidate.proposed_value)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    aria-label={`Approve ${candidate.field_name} change`}
                    className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                    disabled={actionLoading !== null}
                    type="button"
                    onClick={() => handleAction('approve', candidate.id)}
                  >
                    {actionLoading === candidate.id ? '...' : 'Approve'}
                  </button>
                  <button
                    aria-label={`Reject ${candidate.field_name} change`}
                    className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                    disabled={actionLoading !== null}
                    type="button"
                    onClick={() => handleAction('reject', candidate.id)}
                  >
                    {actionLoading === candidate.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {pagination && pagination.hasMore && (
        <div className="text-center">
          <button
            className="text-sm text-primary underline"
            type="button"
            onClick={() => fetchCandidates((pagination.offset ?? 0) + (pagination.limit ?? 50))}
          >
            Load more
          </button>
        </div>
      )}
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
