'use client';

import React, { createContext, useContext, useState } from 'react';

type FilterContextType = {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <FilterContext.Provider value={{ selectedCategory, setSelectedCategory }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
