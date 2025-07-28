'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { CategoryFilter } from '@/components/souks/CategoryFilter';
import { SoukCardModal } from '@/components/souks/SoukCardModal';
import { SoukDetailModal } from '@/components/souks/SoukDetailModal';
import { SouksList } from '@/components/souks/SouksList';
import { EmptyState, SkeletonGrid } from '@/components/ui';
import { sharedTransition } from '@/components/ui/PageTransition';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLoading } from '@/providers/LoadingProvider';
import { useSearch } from '@/providers/search-provider';
import { searchSouks, getBookmarkedSouks, type Souk } from '@/services/souks';
import { getSoukImageUrl } from '@/utils/imageUtils';

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

  // Memoized event handlers
  const handleBookmarkChange = useCallback((soukId: string, isBookmarked: boolean) => {
    if (isBookmarked) {
      setBookmarkedSoukIds((prev) => [...prev, soukId]);
    } else {
      setBookmarkedSoukIds((prev) => prev.filter((id) => id !== soukId));
    }
  }, []);

  const handleSoukClick = useCallback((souk: Souk) => {
    setSelectedSouk(souk);
  }, []);

  const handleCloseModal = useCallback(async () => {
    setSelectedSouk(null);
  }, []);

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

  // During preloading, show skeleton loading
  if (isPreloading) {
    return (
      <div className="relative min-h-full">
        {/* Mobile Header Container - Stable, doesn't re-render */}
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

        {/* Main Content - Loading State */}
        <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-28 sm:pt-8 md:pt-28">
          <SkeletonGrid count={12} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-full">
        {/* Mobile Header Container - Stable, doesn't re-render */}
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

        {/* Main Content - Error State */}
        <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-28 sm:pt-8 md:pt-28">
          <EmptyState
            description="Es gab ein Problem beim Laden der Souks. Bitte versuche es erneut."
            title="Fehler beim Laden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {/* Mobile Header Container - Stable, doesn't re-render */}
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

      {/* Main Content - Only this area updates */}
      <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-28 sm:pt-8 md:pt-28">
        {loading && !isInitialRender ? (
          <SkeletonGrid count={12} />
        ) : souks.length === 0 && !loading ? (
          <EmptyState
            description="Versuche es mit anderen Suchkriterien oder Kategorien."
            title="Keine Souks gefunden"
          />
        ) : (
          <SouksList
            bookmarkedSoukIds={bookmarkedSoukIds}
            souks={souks}
            onBookmarkChange={handleBookmarkChange}
            onSoukClick={handleSoukClick}
          />
        )}
      </div>

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
          imageUrl={getSoukImageUrl(selectedSouk.souk_images)}
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
  );
}
