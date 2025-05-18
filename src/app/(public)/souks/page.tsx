'use client';

import { Suspense, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { SoukCard } from '@/components/shared/SoukCard';
import { SoukDetailModal } from '@/components/shared/SoukDetailModal';
import { useAuth } from '@/hooks/useAuth';
import { searchSouks, getBookmarkedSouks, type Souk } from '@/services/souks';

function SouksContent() {
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
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      {selectedSouk && (
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

export default function SouksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-screen-xl py-8">
          <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
        </div>
      }
    >
      <SouksContent />
    </Suspense>
  );
}
