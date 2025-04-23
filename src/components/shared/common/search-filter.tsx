'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SearchFilterProps {
  initialQuery?: string;
  placeholder?: string;
}

export default function SearchFilter({ 
  initialQuery = '', 
  placeholder = 'Search...' 
}: SearchFilterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new URL search params using current URL
    const params = new URLSearchParams(window.location.search);
    
    // Update or remove the query parameter based on input
    if (query) {
      params.set('query', query);
    } else {
      params.delete('query');
    }
    
    // Reset to page 1 when search changes
    params.set('page', '1');
    
    // Update the URL
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-grow px-4 py-2 focus:outline-none"
          aria-label="Search query"
        />
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 transition-colors"
          disabled={isPending}
          aria-label="Search"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
} 