'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * AlcoholConflictWarning — Plan 193
 *
 * Client component that fetches enrichment alcohol conflict data for a provider
 * and renders a warning banner when enrichment detected alcohol on menu items
 * that contradicts the manual review status.
 *
 * Usage:
 *   <AlcoholConflictWarning providerId="uuid-here" />
 *
 * The warning includes the enrichment source (Wolt, Lieferando, etc.) and a link
 * to the enrichment review panel for resolution.
 */

interface AlcoholConflictDetail {
  candidateId: string;
  source: string;
  sourceUrl: string | null;
  enrichedAt: string;
}

interface AlcoholConflictResult {
  hasConflict: boolean;
  conflicts: AlcoholConflictDetail[];
}

interface AlcoholConflictWarningProps {
  /** Provider UUID to check for conflicts */
  providerId: string;
  /** Optional base URL for the enrichment review link (default: relative) */
  enrichmentReviewBaseUrl?: string;
}

/**
 * Get unique values from an array (avoiding Set to maintain TS compatibility).
 */
function uniqueValues(items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  }
  return result;
}

export function AlcoholConflictWarning({
  providerId,
  enrichmentReviewBaseUrl = `/dashboard/providers/${providerId}/edit/enrichment`,
}: AlcoholConflictWarningProps) {
  const [result, setResult] = useState<AlcoholConflictResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/enrichment/alcohol-conflicts?providerId=${encodeURIComponent(providerId)}`
      );
      if (!res.ok) {
        // If 401/403, silently fail — user isn't admin
        if (res.status === 401 || res.status === 403) {
          setResult(null);
          setLoading(false);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: AlcoholConflictResult = await res.json();
      setResult(data);
    } catch (err) {
      // Don't show errors for non-admin users or transient failures
      setError(err instanceof Error ? err.message : 'Failed to check conflicts');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  // Don't render anything while loading or when there's no conflict
  if (loading || error || !result || !result.hasConflict) {
    return null;
  }

  const sourceNames = result.conflicts.map((c) => c.source);
  const uniqueSources = uniqueValues(sourceNames);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon
            className="h-5 w-5 text-amber-600"
            icon="lucide:triangle-alert"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            Enrichment detected alcohol on menu items
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            Automated enrichment from{' '}
            <strong>{uniqueSources.join(', ')}</strong> found alcohol-related
            menu items that contradict the current manual review setting. Review
            the pending enrichment candidates before approving this provider.
          </p>
          <div className="mt-3">
            <a
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 underline transition-colors hover:text-amber-900"
              href={enrichmentReviewBaseUrl}
            >
              Review enrichment candidates
              <Icon className="h-4 w-4" icon="lucide:arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
