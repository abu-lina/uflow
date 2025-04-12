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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h2 className="font-medium text-lg mb-4">Categories</h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`block w-full text-left px-3 py-2 rounded-md transition ${
              selectedCategory === category.id
                ? 'bg-primary text-white font-medium'
                : 'hover:bg-gray-100'
            }`}
            aria-current={selectedCategory === category.id ? 'true' : 'false'}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
} 