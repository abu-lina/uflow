'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReviewStatusFilter } from '@/features/admin/components/AdminStatusFilter';
import type { SearchResult } from '@/services/providers';

interface UseAdminSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches providers via the search API when an admin status filter is active.
 *
 * The root page's default data source (getMapLocations) joins through the
 * locations table, so providers without location records are excluded. This
 * hook uses the same /api/providers/search endpoint that the /providers page
 * uses, which queries the providers table directly and does not require
 * location records.
 */
export function useAdminSearch(
  status: ReviewStatusFilter,
  section: string = 'food',
): UseAdminSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!status) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          status,
          section,
          pageSize: '50',
          page: '0',
        });
        const res = await fetch(`/api/providers/search?${params}`);
        if (!res.ok) {
          throw new Error(`Search API error: ${res.status}`);
        }
        const data: { results: SearchResult[]; hasMore: boolean } = await res.json();
        if (!cancelled) {
          setResults(data.results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, section, fetchKey]);

  return { results, isLoading, error, refetch };
}
