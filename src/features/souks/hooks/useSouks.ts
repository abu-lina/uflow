import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { SoukListItem } from '../types';

export function useSouks() {
  const [souks, setSouks] = useState<SoukListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSouks() {
      try {
        const { data, error } = await supabase
          .from('souks')
          .select(`
            *,
            owner:profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setSouks(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch souks'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSouks();
  }, []);

  return { data: souks, isLoading, error };
} 