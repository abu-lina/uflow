'use client';

import { useEffect, useState } from 'react';

import { useFilter } from '@/providers/filter-provider';
import { fetchUsedCategories, type Category } from '@/services/categories';

export function CategoryFilter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCategory, setSelectedCategory } = useFilter();

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchUsedCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadCategories();
  }, []);

  if (loading) {
    return <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-100" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-mint text-white'
            : 'bg-white text-neutral-600 hover:bg-neutral-50'
        }`}
        type="button"
        onClick={() => setSelectedCategory(null)}
      >
        Alle
      </button>
      {categories.map((category) => {
        const categoryId = category.category_id;
        if (!categoryId) {
          return null;
        }
        return (
          <button
            key={categoryId}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === categoryId
                ? 'bg-mint text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
            type="button"
            onClick={() => setSelectedCategory(categoryId)}
          >
            {category.name_de || category.name_en || category.name || categoryId}
          </button>
        );
      })}
    </div>
  );
}
