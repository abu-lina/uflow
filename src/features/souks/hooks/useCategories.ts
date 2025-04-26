/**
 * Categories Hook
 * 
 * Hook for fetching and using categories in components.
 * Provides categories data and loading state.
 */

import { useEffect, useState } from 'react';
import { Category } from '@/lib/supabase/types/categories';
import { getCategories } from '@/lib/supabase/services/categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
  };
} 