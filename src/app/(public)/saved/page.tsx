'use client';

import { useEffect, useState } from 'react';

import { MobileLoginScreen } from '@/components/common/MobileLoginScreen';
import { CreatedProviderCard } from '@/components/shared/CreatedProviderCard';
import { ProviderCardModal } from '@/components/providers/ProviderCardModal';
import { ProviderDetailModal } from '@/components/providers/ProviderDetailModal';
import { useAuth } from '@/providers/auth-provider';
import { getBookmarkForProvider, deleteBookmark } from '@/services/bookmarks';
import { getBookmarkedProviders, type Provider } from '@/services/providers';

export default function SavedProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      getBookmarkedProviders(user.id).then((data) => {
        setProviders(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUnsave = async (providerId: string) => {
    if (!user) return;
    try {
      const bookmark = await getBookmarkForProvider(providerId, user.id);
      if (bookmark) {
        await deleteBookmark(bookmark.id);
        setProviders((prev) => prev.filter((s) => s.provider_id !== providerId));
      }
    } catch (err) {
      // Optionally show a toast or error
      console.error('Fehler beim Entfernen des Providers:', err);
    }
  };

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">Diese Seite ist nur auf dem Handy verfügbar.</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <span className="text-center text-lg text-gray-500">
          Du musst angemeldet sein, um gespeicherte Providers zu sehen.
        </span>
        <button
          className="rounded-xl bg-mint px-4 py-2 font-semibold text-white"
          onClick={() => setShowLoginModal(true)}
        >
          Zur Anmeldung
        </button>
        {showLoginModal && <MobileLoginScreen onClose={() => setShowLoginModal(false)} />}
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <h1 className="w-full text-left text-xl font-bold">Gespeicherte Providers</h1>
      <div className="grid w-full grid-cols-2 gap-4">
        {providers.length === 0 ? (
          <span className="col-span-2 text-center text-gray-400">Keine Providers gespeichert.</span>
        ) : (
          providers.map((provider) => (
            <CreatedProviderCard
              key={provider.provider_id}
              category={provider.category?.name_de || ''}
              imageUrl={(() => {
                if (!provider.provider_images) return '/images/placeholder.jpg';
                try {
                  let imagesData: { urls?: string[] } = {};
                  if (typeof provider.provider_images === 'string') {
                    imagesData = JSON.parse(provider.provider_images);
                  } else if (Array.isArray(provider.provider_images)) {
                    imagesData.urls = provider.provider_images;
                  } else if (
                    typeof provider.provider_images === 'object' &&
                    provider.provider_images !== null &&
                    'urls' in provider.provider_images
                  ) {
                    imagesData = provider.provider_images;
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
                provider.barakah_effects && provider.barakah_effects.length > 0
                  ? provider.barakah_effects[0]
                  : '✨ Halal'
              }
              title={provider.provider_name}
              onClick={() => setSelectedProvider(provider)}
              onUnsave={() => handleUnsave(provider.provider_id)}
            />
          ))
        )}
      </div>
      {selectedProvider &&
        (isMobile ? (
          <ProviderCardModal
            open={!!selectedProvider}
            provider={selectedProvider}
            onClose={() => setSelectedProvider(null)}
          />
        ) : (
          <ProviderDetailModal provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
        ))}
    </div>
  );
}
