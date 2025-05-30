'use client';

import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { SoukCard } from '@/components/shared/SoukCard';
import { SoukCardModal } from '@/components/shared/SoukCardModal';
import { SoukDetailModal } from '@/components/shared/SoukDetailModal';
import { useAuth } from '@/hooks/useAuth';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSouk, setSelectedSouk] = useState<Souk | null>(null);
  const searchParams = useSearchParams();
  const [paramVersion, setParamVersion] = useState(0);
  const location = searchParams.get('location') || 'Überall';
  const category = searchParams.get('category') || 'Alle';
  const query = searchParams.get('q') || '';
  const isMobile = useIsMobile();

  useEffect(() => {
    setParamVersion((v) => v + 1);
  }, [searchParams]);

  useEffect(() => {
    async function fetchSouks() {
      try {
        const data = await searchSouks(query, category, location);
        setSouks(data);
      } catch (err) {
        setError('Failed to load souks');
        console.error('Error loading souks:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSouks();
  }, [query, category, location, paramVersion]);

  useEffect(() => {
    if (user && !userLoading) {
      getBookmarkedSouks(user.id)
        .then((bookmarkedSouks) => {
          setBookmarkedSoukIds(bookmarkedSouks.map((s) => s.souk_id));
        })
        .catch(() => setBookmarkedSoukIds([]));
    } else if (!userLoading) {
      setBookmarkedSoukIds([]);
    }
  }, [user, userLoading]);

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
    <div className="mx-auto w-full max-w-screen-xl py-8">
      {/* Souks Grid */}
      <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {souks.map((souk) => (
          <div
            key={souk.souk_id}
            aria-label="Souk Details anzeigen"
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedSouk(souk)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedSouk(souk);
              }
            }}
          >
            <SoukCard
              {...souk}
              hideWebsiteButton={true}
              isBookmarked={bookmarkedSoukIds.includes(souk.souk_id)}
            />
          </div>
        ))}
      </div>
      {/* Mobile Modal */}
      {selectedSouk && isMobile && (
        <SoukCardModal
          address_city={selectedSouk.address_city || ''}
          address_street={selectedSouk.address_street || ''}
          address_zip={selectedSouk.address_zip || ''}
          barakah_effects={selectedSouk.barakah_effects || []}
          category={selectedSouk.category?.name_de || ''}
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
          souk_id={selectedSouk.souk_id}
          title={selectedSouk.souk_name}
          onClose={() => setSelectedSouk(null)}
        />
      )}
      {/* Desktop Modal */}
      {selectedSouk && !isMobile && (
        <SoukDetailModal
          souk={selectedSouk}
          onBookmarkChange={(soukId, isBookmarked) => {
            setBookmarkedSoukIds((prev) =>
              isBookmarked ? [...prev, soukId] : prev.filter((id) => id !== soukId),
            );
          }}
          onClose={() => setSelectedSouk(null)}
        />
      )}
    </div>
  );
}
