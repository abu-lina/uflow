import { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiResponse, ApiError } from '@/types/api';

// Define a more specific type instead of any
interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string, options?: RequestInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setState({ data, isLoading: false, error: null });
      } catch (error) {
        setState({ data: null, isLoading: false, error: error as Error });
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return state;
} 