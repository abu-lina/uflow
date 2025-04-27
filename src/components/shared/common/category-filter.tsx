'use client';

import { useRouter, usePathname } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
}

export default function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleCategoryChange = (categoryId: string) => {
    // Create new URL search params using current URL
    const params = new URLSearchParams(window.location.search);

    // Update category parameter
    if (categoryId !== 'all') {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }

    // Reset to page 1 when category changes
    params.set('page', '1');

    // Update the URL
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-medium">Categories</h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category.id}
            aria-current={selectedCategory === category.id ? 'true' : 'false'}
            className={`block w-full rounded-md px-3 py-2 text-left transition ${
              selectedCategory === category.id
                ? 'bg-primary font-medium text-white'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => handleCategoryChange(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
