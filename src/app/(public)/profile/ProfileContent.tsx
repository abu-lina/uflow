'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CircleHelp, LogOut } from 'lucide-react';
import { Icon } from '@iconify/react';

// import clsx from 'clsx'; // Not used in mobile version

import { CreatedProviderCard } from '@/components/shared/CreatedProviderCard';
import { MobileAboutModal } from '@/components/shared/MobileAboutModal';
import { MobileProfileProviderCard } from '@/components/shared/MobileProfileProviderCard';
import { UserNavigationTabs, UserTab } from '@/components/shared/UserNavigationTabs';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/hooks/useAuth';
import { getCreatedProviders, type Provider, getBookmarkedProviders } from '@/services/providers';
import { authService } from '@/features/auth/services/authService';
import type { SupabaseUser } from '@/types/supabase-user';

interface ProfileContentProps {
  user: SupabaseUser | null;
}

export function ProfileContent({ user }: ProfileContentProps) {
  const { user: clientUser, loading } = useAuth();
  const router = useRouter();
  const [createdProviders, setCreatedProviders] = useState<Provider[]>([]);
  const [savedProviders, setSavedProviders] = useState<Provider[]>([]);
  const [activeTab, setActiveTab] = useState<UserTab>('created');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Use client-side user if server-side user is null
  const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      // No user found on either server or client side
      router.replace('/login');
    }
  }, [effectiveUser, loading, router]);

  // Fetch providers with proper error handling
  useEffect(() => {
    if (!effectiveUser) return;

    const fetchProviders = async () => {
      setIsLoadingProviders(true);
      setError(null);

      try {
        const [created, saved] = await Promise.all([
          getCreatedProviders(effectiveUser.id),
          getBookmarkedProviders(effectiveUser.id),
        ]);

        setCreatedProviders(created ?? []);
        setSavedProviders(saved ?? []);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Fehler beim Laden der Providers');
        setCreatedProviders([]);
        setSavedProviders([]);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    void fetchProviders();
  }, [effectiveUser]);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.signOut();
      router.push('/?auth=required');
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Fehler beim Abmelden');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">🔄</div>
          <p className="text-gray-600">Überprüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">🔐</div>
          <p className="text-gray-600">Anmeldung erforderlich</p>
        </div>
      </div>
    );
  }

  const fullName = effectiveUser.user_metadata?.full_name ?? effectiveUser.email ?? 'Unknown User';

  // Mobile content - matches the provided design
  const mobileContent = (
    <div className="px-4 pt-6 pb-mobile-nav-md">
      {/* Header */}
      <h1 className="mb-6 text-xl font-semibold text-content-title">Profil</h1>

      {/* User Info Card */}
      <button
        className="mb-6 w-full rounded-lg bg-white p-4 text-left transition-colors hover:bg-gray-50"
        onClick={() => router.push('/profile/edit')}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
            <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-full bg-[#589D96] p-1">
              <Icon className="h-10 w-10 text-white" icon="lucide:user" />
            </div>
          
          {/* User Info */}
          <div className="flex-1">
            <div className="font-inter-tight text-lg font-semibold text-[#232323]">
              {fullName}
            </div>
            <div className="font-inter text-sm text-[#555]">
              {effectiveUser.email}
            </div>
          </div>
        </div>
      </button>

      {/* Dein Souks/Services Section */}
      <div className="mb-6">
        <h2 className="mb-4 font-inter-tight text-lg font-semibold text-[#232323]">
          Dein Souks/Services
        </h2>
        
        {isLoadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-2 text-2xl">🔄</div>
              <p className="text-gray-600">Lade Providers...</p>
            </div>
          </div>
        ) : createdProviders.length > 0 ? (
          <div className="space-y-3">
            {createdProviders.map((provider) => (
              <MobileProfileProviderCard
                key={provider.provider_id}
                category={provider.category?.name_de || 'Unbekannt'}
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
                likes={provider.bookmark_count || 0}
                title={provider.provider_name}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 text-center">
            <div className="text-gray-400">Keine Providers erstellt.</div>
          </div>
        )}
      </div>

      {/* Action Items */}
      <div className="rounded-lg bg-white">
        {/* Über Uns */}
        <button
          className="flex w-full items-center gap-4 p-4 text-left"
          onClick={() => router.push('/about')}
        >
          <Image
            alt="UFlow Logo"
            className="h-6 w-6 rounded-full"
            height={24}
            src="/icons/icon-192x192.png"
            width={24}
          />
          <span className="font-inter-tight font-semibold text-[#232323]">Über Uns</span>
        </button>
        
        {/* Divider */}
        <div className="mx-4">
          <svg fill="none" height="1" viewBox="0 0 329 1" width="100%" xmlns="http://www.w3.org/2000/svg">
            <line stroke="#BEBEBE" strokeWidth="0.5" x2="329" y1="0.75" y2="0.75"/>
          </svg>
        </div>

        {/* Support */}
        <button className="flex w-full items-center gap-4 p-4 text-left">
          <CircleHelp className="h-6 w-6 text-black" />
          <span className="font-inter-tight font-semibold text-[#232323]">Support</span>
        </button>
        
        {/* Divider */}
        <div className="mx-4">
          <svg fill="none" height="1" viewBox="0 0 329 1" width="100%" xmlns="http://www.w3.org/2000/svg">
            <line stroke="#BEBEBE" strokeWidth="0.5" x2="329" y1="0.75" y2="0.75"/>
          </svg>
        </div>

        {/* Abmelden */}
        <button
          className="flex w-full items-center gap-4 p-4 text-left disabled:opacity-50"
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          <LogOut className="h-6 w-6 text-black" />
          <span className="font-inter-tight font-semibold text-[#232323]">
            {isLoggingOut ? 'Melde ab...' : 'Abmelden'}
          </span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4">
          <div className="text-center">
            <div className="mb-2 text-2xl">⚠️</div>
            <p className="text-red-600">{error}</p>
            <button
              className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Desktop: tabbed view
  const desktopContent = (
    <div className="flex min-h-full w-full flex-col items-center gap-8 sm:max-w-screen-xl md:pt-20">
      {/* Profile header (greeting, avatar, etc.) */}
      <div className="flex w-full flex-col items-center">
        <div className="text-center font-baskerville text-base">As-Salamu-Aleikum</div>
        <div className="flex w-full flex-row items-center justify-center">
            <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-primary p-4">
              <Icon className="h-10 w-10 text-white" icon="lucide:user" />
            </div>
          <div className="ml-6 flex flex-col items-start justify-center">
            <div className="text-text-primary font-inter-tight text-3xl font-semibold">
              {fullName}
            </div>
            <div className="text-text-secondary font-inter text-base">{effectiveUser.email}</div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex w-full flex-col items-center gap-4 rounded-lg bg-red-50 p-4">
          <div className="text-2xl">⚠️</div>
          <p className="text-center text-red-600">{error}</p>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      <UserNavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-6 w-full">
        {activeTab === 'created' && (
          <div className="flex flex-wrap justify-center gap-8">
            {isLoadingProviders ? (
              <div className="flex w-full items-center justify-center py-8">
                <div className="text-center">
                  <div className="mb-2 text-2xl">🔄</div>
                  <p className="text-gray-600">Lade Providers...</p>
                </div>
              </div>
            ) : createdProviders.length > 0 ? (
              createdProviders.map((provider) => (
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
                />
              ))
            ) : (
              <div className="text-gray-400">Keine Providers erstellt.</div>
            )}
          </div>
        )}
        {activeTab === 'saved' && (
          <div className="flex flex-wrap justify-center gap-8">
            {isLoadingProviders ? (
              <div className="flex w-full items-center justify-center py-8">
                <div className="text-center">
                  <div className="mb-2 text-2xl">🔄</div>
                  <p className="text-gray-600">Lade Providers...</p>
                </div>
              </div>
            ) : savedProviders.length > 0 ? (
              savedProviders.map((provider) => (
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
                />
              ))
            ) : (
              <div className="text-gray-400">Keine Providers gespeichert.</div>
            )}
          </div>
        )}
        {activeTab === 'create' && (
          <div className="flex flex-col items-center">
            <ProviderCreateForm />
          </div>
        )}
      </div>
    </div>
  );

  // Return content with modal
  return (
    <>
      {isMobile ? mobileContent : desktopContent}
      <MobileAboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </>
  );
}
