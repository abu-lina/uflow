'use client';

import { useEffect, useState } from 'react';

import { CreatedSoukCard } from '@/components/shared/CreatedSoukCard';
import { SoukCardModal } from '@/components/shared/SoukCardModal';
import { SoukDetailModal } from '@/components/shared/SoukDetailModal';
import { useAuth } from '@/providers/auth-provider';
import { getBookmarkForSouk, deleteBookmark } from '@/services/bookmarks';
import { getBookmarkedSouks, type Souk } from '@/services/souks';

export default function SavedSouksPage() {
  const { user } = useAuth();
  const [souks, setSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSouk, setSelectedSouk] = useState<Souk | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (user) {
      getBookmarkedSouks(user.id).then((data) => {
        setSouks(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUnsave = async (soukId: string) => {
    if (!user) return;
    try {
      const bookmark = await getBookmarkForSouk(soukId, user.id);
      if (bookmark) {
        await deleteBookmark(bookmark.id);
        setSouks((prev) => prev.filter((s) => s.souk_id !== soukId));
      }
    } catch (err) {
      // Optionally show a toast or error
      console.error('Fehler beim Entfernen des Souks:', err);
    }
  };

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">Diese Seite ist nur auf dem Handy verfügbar.</span>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <h1 className="w-full text-left text-2xl font-bold">Gespeicherte Souks</h1>
      <div className="grid w-full grid-cols-2 gap-4">
        {souks.length === 0 ? (
          <span className="col-span-2 text-center text-gray-400">Keine Souks gespeichert.</span>
        ) : (
          souks.map((souk) => (
            <CreatedSoukCard
              key={souk.souk_id}
              category={souk.category?.name_de || ''}
              imageUrl={(() => {
                if (!souk.souk_images) return '/images/placeholder.jpg';
                try {
                  let imagesData: { urls?: string[] } = {};
                  if (typeof souk.souk_images === 'string') {
                    imagesData = JSON.parse(souk.souk_images);
                  } else if (Array.isArray(souk.souk_images)) {
                    imagesData.urls = souk.souk_images;
                  } else if (
                    typeof souk.souk_images === 'object' &&
                    souk.souk_images !== null &&
                    'urls' in souk.souk_images
                  ) {
                    imagesData = souk.souk_images;
                  }
                  if (imagesData.urls && imagesData.urls.length > 0) {
                    return imagesData.urls[0];
                  }
                } catch {
                  return '/images/placeholder.jpg';
                }
                return '/images/placeholder.jpg';
              })()}
              tag={
                souk.barakah_effects && souk.barakah_effects.length > 0
                  ? souk.barakah_effects[0]
                  : '✨ Halal'
              }
              title={souk.souk_name}
              onClick={() => setSelectedSouk(souk)}
              onUnsave={() => handleUnsave(souk.souk_id)}
            />
          ))
        )}
      </div>
      {selectedSouk &&
        (isMobile ? (
          <SoukCardModal
            address_city={selectedSouk.address_city || undefined}
            address_street={selectedSouk.address_street || undefined}
            address_zip={selectedSouk.address_zip || undefined}
            barakah_effects={selectedSouk.barakah_effects}
            category={selectedSouk.category?.name_de || ''}
            contact_phone={selectedSouk.contact_phone || undefined}
            description={selectedSouk.souk_description || ''}
            imageUrl={(() => {
              if (!selectedSouk.souk_images) return '/images/placeholder.jpg';
              try {
                let imagesData: { urls?: string[] } = {};
                if (typeof selectedSouk.souk_images === 'string') {
                  imagesData = JSON.parse(selectedSouk.souk_images);
                } else if (Array.isArray(selectedSouk.souk_images)) {
                  imagesData.urls = selectedSouk.souk_images;
                } else if (
                  typeof selectedSouk.souk_images === 'object' &&
                  selectedSouk.souk_images !== null &&
                  'urls' in selectedSouk.souk_images
                ) {
                  imagesData = selectedSouk.souk_images;
                }
                if (imagesData.urls && imagesData.urls.length > 0) {
                  return imagesData.urls[0];
                }
              } catch {
                return '/images/placeholder.jpg';
              }
              return '/images/placeholder.jpg';
            })()}
            open={!!selectedSouk}
            social_website={selectedSouk.social_website || undefined}
            souk_id={selectedSouk.souk_id}
            title={selectedSouk.souk_name}
            onClose={() => setSelectedSouk(null)}
          />
        ) : (
          <SoukDetailModal souk={selectedSouk} onClose={() => setSelectedSouk(null)} />
        ))}
    </div>
  );
}
