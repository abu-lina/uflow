'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';

import { fetchUsedCategories, type Category } from '@/services/categories';
import { formatAllahText } from '@/utils/textUtils';

import CategoryGallery from './CategoryGallery';
import ZakatGallery from './ZakatGallery';

export function CategoryGallerySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getCategorySubtitle = (categoryName: string): string => {
    switch (categoryName) {
      case 'Supermarkt':
        return 'Halal einkaufen, Ummah unterstützen';
      case 'Spenden-Projekte':
        return 'Spende für Allahs Wohlgefallen';
      case 'Bildung/Ilm':
        return 'Wissen mit Barakah';
      case 'Kinderbetreuung':
        return 'Für unsere Kleinsten – mit Amanah';
      case 'Dienstleistung':
        return 'Dienen mit Halal-Arbeit und Herz';
      case 'Restaurant & Cafe':
        return 'Genießen mit Barakah und Niya';
      case 'Handwerk':
        return 'Handgemacht mit Barakah';
      case 'Gesundheit & Fitness':
        return 'Körperliche Stärke für Allahs Weg';
      case 'Moschee':
        return 'Stärke das Haus Allahs';
      case 'Einkaufshilfe':
        return 'Teile Deinen Rizq mit Bedürftigen';
      case 'Einzelhandel':
        return 'Einkaufen mit Niya und Wirkung';
      default:
        return 'Lerne unsere Zakat Partner kennen';
    }
  };

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

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to search page with category filter
    router.push(`/souks?category=${categoryId}`);
  };

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
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-6 pb-8 pt-4 lg:hidden"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="flex flex-col gap-6">
        {categories
          .sort((a, b) => {
            // Put Spenden-Projekte first
            if (a.name_de === 'Spenden-Projekte') return -1;
            if (b.name_de === 'Spenden-Projekte') return 1;
            return 0;
          })
          .map((category, _index) => {
            const categoryName = (category.name_de || '') as string;
            return (
              <div
                key={category.category_id}
                aria-label={`Alle Souks in der Kategorie ${categoryName} anzeigen`}
                className="-m-2 flex cursor-pointer flex-col rounded-lg p-2 transition-transform hover:scale-[1.02] hover:bg-gray-50/50 active:scale-[0.98]"
                role="button"
                tabIndex={0}
                onClick={() => handleCategoryClick(category.category_id as string)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCategoryClick(category.category_id as string);
                  }
                }}
              >
                <div className="flex w-full flex-row items-start justify-between">
                  <div className="flex flex-col items-start justify-between gap-2.5 p-3">
                    <div className="flex flex-col items-start">
                      <div className="w-full font-inter text-[14px] font-normal leading-[140%] text-[#232323]">
                        {formatAllahText(getCategorySubtitle(categoryName))}
                      </div>
                      <div className="w-full truncate font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
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

                {category.category_id === '2335922b-76a9-4d79-b32a-b3f95941ba5c' ? (
                  <motion.div
                    className="relative"
                    style={{
                      background:
                        'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
                      padding: '1px',
                      borderRadius: '29px',
                    }}
                  >
                    {/* Subtle animated light effect for Spenden-Projekte */}
                    <motion.div
                      animate={{
                        backgroundPosition: [
                          '100% 0%', // Start: top-right
                          '100% 100%', // Move: bottom-right
                          '0% 100%', // Move: bottom-left
                          '0% 0%', // Move: top-left
                          '100% 0%', // End: back to top-right
                        ],
                      }}
                      className="absolute inset-0 rounded-[29px]"
                      style={{
                        background:
                          'radial-gradient(circle at center, rgba(255, 215, 0, 0.3) 0%, rgba(255, 248, 220, 0.2) 40%, transparent 70%)',
                        backgroundSize: '30px 30px',
                        filter: 'blur(3px)',
                        opacity: 0.6,
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                    <div className="relative z-10">
                      <ZakatGallery />
                    </div>
                  </motion.div>
                ) : (
                  <CategoryGallery categoryId={category.category_id as string} />
                )}
              </div>
            );
          })}
      </div>
    </motion.section>
  );
}
