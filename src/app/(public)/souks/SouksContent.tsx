'use client';

import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { CategoryFilter } from '@/components/souks/CategoryFilter';
import { SoukCard } from '@/components/souks/SoukCard';
import { SoukCardModal } from '@/components/souks/SoukCardModal';
import { SoukDetailModal } from '@/components/souks/SoukDetailModal';
import { sharedTransition } from '@/components/ui/PageTransition';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/providers/LoadingProvider';
import { useSearch } from '@/providers/search-provider';
import { searchSouks, getBookmarkedSouks, type Souk } from '@/services/souks';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function SouksContent() {
  const { user, loading: userLoading } = useAuth();
  const [souks, setSouks] = useState<Souk[]>([]);
  const [bookmarkedSoukIds, setBookmarkedSoukIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSouk, setSelectedSouk] = useState<Souk | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const searchParams = useSearchParams();
  const [paramVersion, setParamVersion] = useState(0);
  const location = searchParams.get('location') || 'Überall';
  const query = searchParams.get('q') || '';
  const isMobile = useIsMobile();

  // Get search context to sync with URL parameters
  const { selectedCategory, setSelectedCategory, setSearchQuery, setSelectedLocation } =
    useSearch();

  // Use provider state for category, fallback to URL params
  const category = selectedCategory ?? (searchParams.get('category') || null);

  // Cache for souks data
  const [souksCache, setSouksCache] = useState<Record<string, Souk[]>>({});

  const { isPreloading } = useLoading();

  // Sync URL parameters with search context
  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
    if (query) {
      setSearchQuery(query);
    }
    if (location) {
      setSelectedLocation(location);
    }
  }, [category, query, location, setSelectedCategory, setSearchQuery, setSelectedLocation]);

  // Listen for category changes from CategoryFilter
  useEffect(() => {
    const handleCategoryChange = (event: CustomEvent) => {
      const { category } = event.detail;
      setSelectedCategory(category);
      // Force a re-fetch by updating paramVersion
      setParamVersion((v) => v + 1);
    };

    window.addEventListener('categoryChanged', handleCategoryChange as EventListener);
    return () => {
      window.removeEventListener('categoryChanged', handleCategoryChange as EventListener);
    };
  }, [setSelectedCategory]);

  useEffect(() => {
    setParamVersion((v) => v + 1);
  }, [searchParams]);

  useEffect(() => {
    async function fetchSouks() {
      const cacheKey = `${query}-${category}-${location}`;

      // If we have cached data, use it immediately
      if (souksCache[cacheKey]) {
        setSouks(souksCache[cacheKey]);
        setIsInitialRender(false);
        return;
      }

      try {
        // Only show loading if it takes more than 100ms and it's not the initial render
        const loadingTimeout = setTimeout(() => {
          if (!isInitialRender) {
            setLoading(true);
          }
        }, 100);

        const data = await searchSouks(query, category || 'Alle', location);
        setSouks(data);

        // Cache the results
        setSouksCache((prev) => ({
          ...prev,
          [cacheKey]: data,
        }));

        clearTimeout(loadingTimeout);
        setLoading(false);
        setIsInitialRender(false);
      } catch (err) {
        setError('Failed to load souks');
        console.error('Error loading souks:', err);
        setLoading(false);
        setIsInitialRender(false);
      }
    }

    void fetchSouks();
  }, [query, category, location, paramVersion, souksCache, isInitialRender]);

  // Optimize bookmark fetching
  useEffect(() => {
    if (user && !userLoading) {
      const loadingTimeout = setTimeout(() => {
        if (!isInitialRender) {
          setLoading(true);
        }
      }, 100);

      getBookmarkedSouks(user.id)
        .then((bookmarkedSouks) => {
          setBookmarkedSoukIds(bookmarkedSouks.map((s) => s.souk_id));
          clearTimeout(loadingTimeout);
          setLoading(false);
        })
        .catch(() => {
          setBookmarkedSoukIds([]);
          clearTimeout(loadingTimeout);
          setLoading(false);
        });
    } else if (!userLoading) {
      setBookmarkedSoukIds([]);
    }
  }, [user, userLoading, isInitialRender]);

  // During preloading, we want to keep the content hidden
  if (isPreloading) {
    return null;
  }

  const handleBookmarkChange = (soukId: string, isBookmarked: boolean) => {
    setBookmarkedSoukIds((prev) =>
      isBookmarked ? [...prev, soukId] : prev.filter((id) => id !== soukId),
    );
  };

  const handleSoukClick = (souk: Souk) => {
    setSelectedSouk(souk);
    // Remove router.push to prevent navigation issues
    // router.push(`/souks/${souk.souk_id}`);
  };

  const handleCloseModal = async () => {
    setSelectedSouk(null);
    // Remove router.push to prevent background reload
    // router.push('/souks');

    // Refresh bookmarked souks after closing modal
    if (user) {
      try {
        const bookmarkedSouks = await getBookmarkedSouks(user.id);
        setBookmarkedSoukIds(bookmarkedSouks.map((s) => s.souk_id));
      } catch (error) {
        console.error('Error refreshing bookmarked souks:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-xl py-8">
        <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-screen-xl py-8">
        <div className="text-uFlowText font-inter-tight text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {/* Mobile Header Container */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden"
        initial={{ opacity: 0, y: -1 }}
        transition={sharedTransition}
      >
        {/* Search Bar */}
        <div className="px-6 pb-0 pt-4">
          <SearchBar
            className="rounded-lg border border-gray-200 shadow-sm"
            hideCategoryFilter={true}
          />
        </div>

        {/* Gap */}
        <div className="h-3 px-6" />

        {/* Category Filter */}
        <div className="pb-1.5 pl-6 pr-0">
          <CategoryFilter />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-28 sm:pt-8 md:pt-28">
        <motion.div
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          transition={sharedTransition}
        >
          {souks.map((souk, index) => (
            <motion.div
              key={souk.souk_id}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              initial={{ opacity: 0, y: 5, scale: 0.98 }}
              role="button"
              tabIndex={0}
              transition={{
                ...sharedTransition,
                delay: index * 0.02,
              }}
              onClick={() => handleSoukClick(souk)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSoukClick(souk);
                }
              }}
            >
              <SoukCard
                {...souk}
                hideWebsiteButton={true}
                isBookmarked={bookmarkedSoukIds.includes(souk.souk_id)}
                onBookmarkChange={(isBookmarked: boolean) =>
                  handleBookmarkChange(souk.souk_id, isBookmarked)
                }
              />
            </motion.div>
          ))}
        </motion.div>
        {/* Mobile Modal */}
        {selectedSouk && isMobile && (
          <SoukCardModal
            address_city={selectedSouk.address_city || ''}
            address_street={selectedSouk.address_street || ''}
            address_zip={selectedSouk.address_zip || ''}
            barakah_effects={selectedSouk.barakah_effects || []}
            category={selectedSouk.category?.name_de || ''}
            contact_phone={selectedSouk.contact_phone || undefined}
            description={selectedSouk.souk_description || ''}
            imageUrl={(() => {
              // Get first image URL or placeholder
              try {
                if (!selectedSouk.souk_images) return '/images/placeholder.jpg';
                let imagesData: { urls?: string[] } = {};
                if (typeof selectedSouk.souk_images === 'string') {
                  imagesData = JSON.parse(selectedSouk.souk_images);
                } else if (Array.isArray(selectedSouk.souk_images)) {
                  imagesData.urls = selectedSouk.souk_images;
                } else if (
                  typeof selectedSouk.souk_images === 'object' &&
                  selectedSouk.souk_images !== null &&
                  'urls' in selectedSouk.souk_images &&
                  Array.isArray((selectedSouk.souk_images as { urls?: unknown }).urls)
                ) {
                  imagesData = selectedSouk.souk_images as { urls?: string[] };
                }
                if (imagesData.urls && imagesData.urls.length > 0) {
                  return imagesData.urls[0];
                }
                return '/images/placeholder.jpg';
              } catch {
                return '/images/placeholder.jpg';
              }
            })()}
            open={!!selectedSouk}
            social_website={selectedSouk.social_website || undefined}
            souk_id={selectedSouk.souk_id}
            title={selectedSouk.souk_name}
            onClose={handleCloseModal}
          />
        )}
        {/* Desktop Modal */}
        {selectedSouk && !isMobile && (
          <SoukDetailModal
            souk={selectedSouk}
            onBookmarkChange={handleBookmarkChange}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
}
