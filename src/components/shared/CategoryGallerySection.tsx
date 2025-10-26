'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';

import { fetchUsedCategories, type Category } from '@/services/categories';
import { formatAllahText } from '@/utils/textUtils';
import { getLocalizedDescription, detectUserLanguage, getLocalizedName } from '@/utils/languageUtils';

import UnifiedGallery from './UnifiedGallery';
import { getEntityTypeForCategory } from '@/utils/entityTypeUtils';

export function CategoryGallerySection() {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Check if we've already animated this session
    const animated = sessionStorage.getItem('home-categories-animated');
    if (animated) {
      setHasAnimated(true);
    } else {
      sessionStorage.setItem('home-categories-animated', 'true');
    }
  }, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getCategorySubtitle = (category: Category): string => {
    // Use database description with language detection
    const localizedDescription = getLocalizedDescription(
      category.description_de,
      category.description_en,
      // Fallback to hardcoded descriptions if database descriptions are not available
      getHardcodedSubtitle(category.name_de)
    );
    
    return localizedDescription;
  };

  const getCategoryName = (category: Category): string => {
    return getLocalizedName(category.name_de, category.name_en);
  };

  // Fallback function for hardcoded descriptions (when database descriptions are not available)
  const getHardcodedSubtitle = (categoryName: string): string => {
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
               // Debug each category's images
               fetchedCategories.forEach((cat, index) => {
                 console.log(`Category ${index} (${cat.name_de}):`, {
                   id: cat.category_id,
                   name: cat.name_de,
                   category_images: cat.category_images
                 });
               });
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
    router.push(`/providers?category=${categoryId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCategoryClick(categoryId);
    }
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
    return null;
  }

  const sortedCategories = categories.sort((a, b) => {
    if (a.name_de === 'Spenden-Projekte') return -1;
    if (b.name_de === 'Spenden-Projekte') return 1;
    return 0;
  });

  const SectionComponent = hasAnimated ? 'section' : motion.section;

  return (
    <SectionComponent
      {...(!hasAnimated && {
        animate: { opacity: 1, y: 0 },
        initial: { opacity: 0, y: 20 },
        transition: { duration: 0.8, ease: 'easeOut' },
      })}
      className="w-full pb-20 pt-4 lg:hidden"
    >
      <div className="flex flex-col gap-6">
        {sortedCategories.map((category) => {
          const categoryName = getCategoryName(category);
          const categoryId = category.category_id as string;

          return (
            <div
              key={categoryId}
              aria-label={detectUserLanguage() === 'en' 
                ? `Show all providers in ${categoryName} category`
                : `Alle Provider in der Kategorie ${categoryName} anzeigen`}
              className="flex cursor-pointer flex-col rounded-lg transition-transform hover:scale-[1.02] hover:bg-gray-50/50 active:scale-[0.98]"
              role="button"
              tabIndex={0}
              onClick={() => handleCategoryClick(categoryId)}
              onKeyDown={(e) => handleKeyDown(e, categoryId)}
            >
              <div className="flex w-full flex-row items-center pl-3 pt-3 pb-3">
                <div className="flex flex-1 min-w-0 flex-col items-start justify-center pr-3">
                  <div className="w-full font-inter text-sm font-normal leading-[140%] text-[#232323] break-words">
                    {formatAllahText(getCategorySubtitle(category))}
                  </div>
                  <div className="w-full min-w-0 truncate font-inter text-xl font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
                    {categoryName}
                  </div>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center ml-auto">
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

              <UnifiedGallery 
                category={category} 
                categoryId={categoryId} 
                entityType={getEntityTypeForCategory(categoryId)}
              />
            </div>
          );
        })}
      </div>
    </SectionComponent>
  );
}
