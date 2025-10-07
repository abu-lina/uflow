'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CreatedProviderCard } from '@/components/shared/CreatedProviderCard';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/providers/auth-provider';
import { getBookmarkForProvider, deleteBookmark } from '@/services/bookmarks';
import { getBookmarkedProviders, type Provider } from '@/services/providers';

export default function SavedProvidersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);


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


  if (!user) {
    return (
      <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
        {/* Sticky Header */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl">
          <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
            {/* Left-aligned Title */}
            <h1 className="text-xl font-semibold text-content-title">
              Gespeichert
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 mobile-nav-spacing">
          <span className="text-center text-lg text-content-title mb-6">
            Du musst angemeldet sein, um gespeicherte Inhalte zu sehen.
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push('/login')}
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Sticky Header */}
      <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl">
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Left-aligned Title */}
          <h1 className="text-xl font-semibold text-content-title">
            Gespeichert
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center px-4 pt-20 mobile-nav-spacing overflow-y-auto">
        {/* Search Bar */}
        <div className="w-full mb-6">
          <SearchBar hideCategoryFilter={true} />
        </div>
        
        <div className="grid w-full grid-cols-2 gap-4">
        {providers.length === 0 ? (
          <span className="col-span-2 text-center text-gray-400">Keine Providers gespeichert.</span>
        ) : (
          providers.map((provider) => (
            <CreatedProviderCard
              key={provider.provider_id}
              address={
                provider.address_street && provider.address_city
                  ? `${provider.address_street}, ${provider.address_city}`
                  : provider.address_street || provider.address_city || undefined
              }
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
              title={provider.provider_name}
              onClick={() => router.push(`/providers/${provider.provider_id}`)}
              onUnsave={() => handleUnsave(provider.provider_id)}
            />
          ))
        )}
        </div>
      </div>
    </div>
  );
}
