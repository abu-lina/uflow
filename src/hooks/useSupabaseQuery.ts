import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { PostgrestError } from '@supabase/supabase-js';

interface UseSupabaseQueryResult<T> {
  data: T[] | null;
  count: number | null;
  error: PostgrestError | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T>({
  tableName,
  columns = '*',
  filters = [],
  pagination = { page: 1, pageSize: 10 },
  orderBy = { column: 'created_at', ascending: false },
  dependencies = []
}: {
  tableName: string;
  columns?: string;
  filters?: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'is';
    value: any;
  }>;
  pagination?: { page: number; pageSize: number };
  orderBy?: { column: string; ascending: boolean };
  dependencies?: any[];
}): UseSupabaseQueryResult<T> {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<T[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate pagination values
      const { page, pageSize } = pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Start the query
      let query = supabase
        .from(tableName)
        .select(columns, { count: 'exact' });
      
      // Apply all filters
      filters.forEach(filter => {
        const { column, operator, value } = filter;
        
        switch (operator) {
          case 'eq':
            query = query.eq(column, value);
            break;
          case 'neq':
            query = query.neq(column, value);
            break;
          case 'gt':
            query = query.gt(column, value);
            break;
          case 'lt':
            query = query.lt(column, value);
            break;
          case 'gte':
            query = query.gte(column, value);
            break;
          case 'lte':
            query = query.lte(column, value);
            break;
          case 'like':
            query = query.like(column, value);
            break;
          case 'ilike':
            query = query.ilike(column, value);
            break;
          case 'is':
            query = query.is(column, value);
            break;
        }
      });
      
      // Add ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
      
      // Add pagination
      query = query.range(from, to);
      
      // Execute the query
      const { data: result, error: queryError, count: totalCount } = await query;
      
      if (queryError) {
        setError(queryError);
        setData(null);
        setCount(null);
      } else {
        setData(result as T[]);
        setCount(totalCount);
        setError(null);
      }
    } catch (err) {
      console.error('Error in useSupabaseQuery:', err);
      setError(err as PostgrestError);
      setData(null);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [
    supabase,
    tableName,
    columns,
    JSON.stringify(filters),
    JSON.stringify(pagination),
    JSON.stringify(orderBy),
    ...dependencies
  ]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, count, error, loading, refetch: fetchData };
} 