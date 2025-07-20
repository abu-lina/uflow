'use client';

import { useEffect, useState } from 'react';

import { fetchUsedCategories, type Category } from '@/services/categories';

import CategoryGallery from './CategoryGallery';

export function CategoryGallerySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const fetchedCategories = await fetchUsedCategories();
        console.log('Fetched categories for CategoryGallerySection:', fetchedCategories);
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    }

    loadCategories();
  }, []);

  if (isLoading) {
    return (
      <section className="w-full px-6 py-8 lg:hidden">
        <div className="flex flex-col gap-8">
          <div className="bg-muted h-6 w-40 animate-pulse rounded" />
          <div className="bg-muted h-[150px] w-[358px] animate-pulse rounded-[29px]" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full px-6 py-8 text-center text-red-500 lg:hidden">
        <p>{error}</p>
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // Don't render section if no categories are found
  }

  return (
    <section className="w-full px-6 py-8 lg:hidden">
      <div className="flex flex-col gap-8">
        {categories.map((category) => {
          const categoryName = (category.name_de || '') as string;
          return (
            <div key={category.category_id} className="flex flex-col gap-4">
              <div className="flex w-full flex-row items-start justify-between">
                <div className="flex flex-col items-start justify-between gap-2.5 p-3">
                  <div className="flex flex-col items-start">
                    <div className="w-full font-inter text-[14px] font-normal leading-[140%] text-[#232323]">
                      Lerne unsere Zakat Partner kennen
                    </div>
                    <div className="w-full font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
                      {categoryName}
                    </div>
                  </div>
                </div>

                {/* Right side - Chevron */}
                <div className="flex flex-row items-start justify-end gap-2.5 p-2.5">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <svg
                      className="text-[#232323]"
                      fill="none"
                      height="32"
                      viewBox="0 0 24 24"
                      width="32"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 18L15 12L9 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <CategoryGallery categoryId={category.category_id as string} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
