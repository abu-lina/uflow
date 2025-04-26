import { useEffect, useState, useCallback } from 'react';
import type { Database } from '@/types/database';

type TableName = keyof Database['public']['Tables'];
type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];

interface UseSupabaseQueryResult<T> {
  data: T[] | null;
  count: number | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

interface ApiResponse<T> {
  data: T[];
  total?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

type FilterValue = string | number | boolean | null;

export function useSupabaseQuery<T extends TableName>({
  tableName,
  filters = [],
  pagination = { page: 1, pageSize: 10 },
  orderBy = { column: 'created_at', ascending: false },
  dependencies = [] as unknown[]
}: {
  tableName: T;
  filters?: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'is';
    value: FilterValue;
  }>;
  pagination?: { page: number; pageSize: number };
  orderBy?: { column: string; ascending: boolean };
  dependencies?: unknown[];
}): UseSupabaseQueryResult<Row<T>> {
  const [data, setData] = useState<Row<T>[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sort: orderBy.column,
        ascending: orderBy.ascending.toString()
      });

      // Add filters to query parameters
      filters.forEach((filter, index) => {
        params.append(`filters[${index}][column]`, filter.column);
        params.append(`filters[${index}][operator]`, filter.operator);
        params.append(`filters[${index}][value]`, JSON.stringify(filter.value));
      });

      const response = await fetch(`/api/data?table=${tableName}&${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as ApiResponse<Row<T>>;
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data);
      setCount(result.pagination?.total ?? result.total ?? null);
      setError(null);
    } catch (err) {
      console.error('Error in useSupabaseQuery:', err);
      setError(err as Error);
      setData(null);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [
    tableName,
    filters,
    pagination,
    orderBy,
    ...dependencies
  ]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, count, error, loading, refetch: fetchData };
}

// NOTE: For best results, ensure filters, pagination, and orderBy are memoized by the caller (e.g., useMemo) to avoid unnecessary fetches. 