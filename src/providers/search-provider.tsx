'use client';

import React, { createContext, useContext, useState } from 'react';

export type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Canonical sentinel for "all locations" — empty string means no location filter.
// UI components translate this to the user's language (e.g., "Everywhere" / "Überall").
export const LOCATION_ALL = '';

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(LOCATION_ALL);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedLocation,
        setSelectedLocation,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
