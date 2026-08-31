'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { fetchUsedCategories, fetchCategoriesBySection, type Category } from '@/services/categories';
import {
  inferSectionFromCategory,
  type Section,
} from '@/config/sectionFilters';
import { buildResultsUrl } from '@/lib/search-params';
import { slugify } from '@/lib/slugify';
import { formatAllahText } from '@/utils/textUtils';
import {
  getLocalizedDescription,
  detectUserLanguage,
  getLocalizedName,
} from '@/utils/languageUtils';

import UnifiedGallery from './UnifiedGallery';
import { getEntityTypeForCategory } from '@/utils/entityTypeUtils';

interface CategoryGallerySectionProps {
  section?: Section;
  city?: string;
}

export function CategoryGallerySection({ section, city }: CategoryGallerySectionProps = {}) {
  const router = useRouter();

  // Use React Query to cache categories data and prevent refetching on navigation
  const {
    data: categories = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: section ? ['categories-by-section', section] : ['used-categories'],
    queryFn: section ? () => fetchCategoriesBySection(section) : fetchUsedCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    placeholderData: (previousData) => previousData, // Show cached data immediately
  });

  const error = queryError ? 'Failed to load categories.' : null;

  const getCategorySubtitle = (category: Category): string => {
    // Use database description with language detection
    const localizedDescription = getLocalizedDescription(
      category.description_de,
      category.description_en,
      // Fallback to hardcoded descriptions if database descriptions are not available
      getHardcodedSubtitle(category.name_de),
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

  const handleCategoryClick = (categoryId: string, cat: Category) => {
    const resolvedSection = section ?? inferSectionFromCategory(categoryId);
    const categorySlug = cat.slug ?? slugify(cat.name_en ?? cat.name_de);
    const url = buildResultsUrl({
      section: resolvedSection,
      city: city ?? null,
      categorySlug,
    });
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string, cat: Category) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCategoryClick(categoryId, cat);
    }
  };

  if (isLoading) {
    return (
      <section className="w-full px-6 py-8 lg:hidden">
        <div className="flex flex-col gap-8">
          <div className="bg-muted h-6 w-40 rounded" />
          <div className="bg-muted h-[150px] w-[358px] rounded-[29px]" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full px-6 py-8 text-center text-danger lg:hidden">
        <p>{error}</p>
      </section>
    );
  }

  if (categories.length === 0) {
    // Plan 090: when section filter is active, show a "coming soon" message rather than
    // silently rendering nothing — required by plan acceptance criterion M3/Task 4.
    if (section) {
      const isEnglish = detectUserLanguage() === 'en';
      return (
        <section className="w-full px-6 py-12 text-center text-muted-foreground lg:hidden">
          <p className="text-sm">{isEnglish ? 'Coming soon' : 'Demnächst verfügbar'}</p>
        </section>
      );
    }
    return null;
  }

  const sortedCategories = categories.sort((a, b) => {
    if (a.name_de === 'Spenden-Projekte') return -1;
    if (b.name_de === 'Spenden-Projekte') return 1;
    return 0;
  });

  return (
    <section className="w-full pb-20 pt-0 lg:hidden">
      <div className="flex flex-col gap-6">
        {sortedCategories.map((category) => {
          const categoryName = getCategoryName(category);
          const categoryId = category.category_id as string;

          return (
            <div
              key={categoryId}
              aria-label={
                detectUserLanguage() === 'en'
                  ? `Show all providers in ${categoryName} category`
                  : `Alle Provider in der Kategorie ${categoryName} anzeigen`
              }
              className="flex cursor-pointer flex-col rounded-lg transition-transform hover:scale-[1.02] hover:bg-gray-50/50 active:scale-[0.98]"
              role="button"
              tabIndex={0}
              onClick={() => handleCategoryClick(categoryId, category)}
              onKeyDown={(e) => handleKeyDown(e, categoryId, category)}
            >
              <div className="flex w-full flex-row items-center pb-3 pl-3 pt-3">
                <div className="flex min-w-0 flex-1 flex-col items-start justify-center pr-3">
                  <div className="w-full break-words font-inter text-sm font-normal leading-[140%] text-[#232323]">
                    {formatAllahText(getCategorySubtitle(category))}
                  </div>
                  <div className="w-full min-w-0 truncate font-inter text-xl font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
                    {categoryName}
                  </div>
                </div>

                <div className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center">
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
    </section>
  );
}
