/**
 * useDebouncedValue
 * 
 * Custom hook that debounces a value, useful for search inputs
 * to prevent excessive filtering/re-renders on every keystroke.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearch = useDebouncedValue(searchQuery, 300);
 * 
 * // Use debouncedSearch for filtering instead of searchQuery
 * useEffect(() => {
 *   // Filter logic here - only runs after 300ms of no typing
 * }, [debouncedSearch]);
 * ```
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

