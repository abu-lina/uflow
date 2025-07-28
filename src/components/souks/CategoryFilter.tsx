'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { useSearch } from '@/providers/search-provider';
import { fetchUsedCategories, type Category } from '@/services/categories';

interface CategoryFilterProps {
  className?: string;
}

export function CategoryFilter({ className = '' }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCategory, setSelectedCategory } = useSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current selected category from provider or URL
  const currentCategory = selectedCategory ?? searchParams.get('category');

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const allCategories = await fetchUsedCategories();
        // Sort categories alphabetically by name_de
        const sortedCategories = allCategories.sort((a, b) => {
          const nameA = (a.name_de || a.category_id || '').toLowerCase();
          const nameB = (b.name_de || b.category_id || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setCategories(sortedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId: string | null) => {
    // Update provider state immediately for instant UI feedback
    setSelectedCategory(categoryId);

    // Scroll to center the selected category immediately
    setTimeout(() => {
      const container = document.querySelector('[data-category-container]');
      const selectedButton = document.querySelector(`[data-category-id="${categoryId || 'alle'}"]`);

      if (container && selectedButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        const buttonCenter = buttonRect.left + buttonRect.width / 2;
        const scrollOffset = buttonCenter - containerCenter;

        container.scrollBy({
          left: scrollOffset,
          behavior: 'smooth',
        });
      }
    }, 50);

    // Update URL using Next.js router for proper navigation
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }

    router.replace(`/souks?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <div
        data-category-container
        className={`flex items-center overflow-x-auto pb-2 ${className}`}
      >
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-category-container className={`flex items-center overflow-x-auto pb-2 ${className}`}>
      <div className="flex gap-3">
        {/* "Alle" (All) category */}
        <motion.button
          className={`relative whitespace-nowrap px-4 py-1 text-sm font-medium transition-colors ${
            !currentCategory ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'
          }`}
          data-category-id="alle"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleCategoryClick(null)}
        >
          Alle
          {!currentCategory && (
            <motion.div
              className="absolute -bottom-1 left-0 right-0 h-0.5"
              initial={false}
              layoutId="category-underline"
              style={{ backgroundColor: '#589D96' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>

        {/* Category buttons */}
        {categories.map((category, index) => (
          <div key={category.category_id} className="flex">
            <motion.button
              className={`relative whitespace-nowrap px-4 py-1 text-sm font-medium transition-colors ${
                currentCategory === category.category_id
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              data-category-id={category.category_id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategoryClick(category.category_id || null)}
            >
              {category.name_de || category.category_id || 'Unbenannt'}
              {currentCategory === category.category_id && (
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-0.5"
                  initial={false}
                  layoutId="category-underline"
                  style={{ backgroundColor: '#589D96' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            {index === categories.length - 1 && <div className="w-6" />}
          </div>
        ))}
      </div>
    </div>
  );
}
