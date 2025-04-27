'use client';

import { useState, useTransition } from 'react';

import { useRouter, usePathname } from 'next/navigation';

interface SearchFilterProps {
  initialQuery?: string;
  placeholder?: string;
}

export default function SearchFilter({
  initialQuery = '',
  placeholder = 'Search...',
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
    <form className="relative" onSubmit={handleSearch}>
      <div className="flex items-center overflow-hidden rounded-md border border-gray-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
        <input
          aria-label="Search query"
          className="flex-grow px-4 py-2 focus:outline-none"
          placeholder={placeholder}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          aria-label="Search"
          className="bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-dark"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
