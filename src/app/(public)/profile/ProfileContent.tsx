'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import clsx from 'clsx';

import { CreatedSoukCard } from '@/components/shared/CreatedSoukCard';
import { MobileAboutModal } from '@/components/shared/MobileAboutModal';
import { UserNavigationTabs, UserTab } from '@/components/shared/UserNavigationTabs';
import { SoukCreateForm } from '@/features/souks/SoukCreateForm';
import { useAuth } from '@/hooks/useAuth';
import { getCreatedSouks, type Souk, getBookmarkedSouks } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

interface ProfileContentProps {
  user: SupabaseUser | null;
}

export function ProfileContent({ user }: ProfileContentProps) {
  const { user: clientUser, loading } = useAuth();
  const router = useRouter();
  const [createdSouks, setCreatedSouks] = useState<Souk[]>([]);
  const [savedSouks, setSavedSouks] = useState<Souk[]>([]);
  const [activeTab, setActiveTab] = useState<UserTab>('created');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSouks, setIsLoadingSouks] = useState(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Use client-side user if server-side user is null
  const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      // No user found on either server or client side
      router.replace('/?auth=required');
    }
  }, [effectiveUser, loading, router]);

  // Fetch souks with proper error handling
  useEffect(() => {
    if (!effectiveUser) return;

    const fetchSouks = async () => {
      setIsLoadingSouks(true);
      setError(null);

      try {
        const [created, saved] = await Promise.all([
          getCreatedSouks(effectiveUser.id),
          getBookmarkedSouks(effectiveUser.id),
        ]);

        setCreatedSouks(created ?? []);
        setSavedSouks(saved ?? []);
      } catch (err) {
        console.error('Error fetching souks:', err);
        setError('Fehler beim Laden der Souks');
        setCreatedSouks([]);
        setSavedSouks([]);
      } finally {
        setIsLoadingSouks(false);
      }
    };

    void fetchSouks();
  }, [effectiveUser?.id]);

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
  const avatarUrl =
    typeof effectiveUser.user_metadata?.avatar_url === 'string' &&
    effectiveUser.user_metadata.avatar_url
      ? effectiveUser.user_metadata.avatar_url
      : '/icons/icon-muslim.png';

  // Mobile content
  const mobileContent = (
    <div
      className={clsx(
        'flex min-h-full w-full flex-col items-center gap-8',
        'sm:max-w-screen-xl',
        isMobile && 'mx-auto w-[345px] px-6',
        isMobile && 'hide-scrollbar h-[calc(100vh-64px)] overflow-y-auto pb-4',
      )}
      style={isMobile ? { maxHeight: 'calc(100vh - 64px)' } : {}}
    >
      {/* Greeting/Profile Block - always visible */}
      <div className={clsx('flex w-full flex-col items-center', isMobile && 'gap-6 pb-2 pt-6')}>
        {/* Greeting */}
        <div
          className={clsx(
            'text-center font-baskerville text-base',
            isMobile &&
              'bg-gradient-to-b from-[#D2B581] via-[#DCC391] to-[#AF8650] bg-clip-text text-[16px] leading-[18px] text-transparent',
          )}
        >
          As-Salamu-Aleikum
        </div>
        {/* Profile Info Row */}
        <div
          className={clsx('flex w-full flex-row items-center justify-center', isMobile && 'gap-4')}
        >
          {/* Profile Image */}
          <div
            className={clsx(
              'flex items-center justify-center rounded-full bg-primary',
              isMobile ? 'h-[92px] w-[92px] bg-[#589D96] p-[18.4px]' : 'h-[80px] w-[80px] p-4',
            )}
          >
            <Image
              alt="Profilbild"
              className="rounded-full object-cover"
              height={isMobile ? 78.2 : 80}
              src={avatarUrl}
              width={isMobile ? 78.2 : 80}
            />
          </div>
          {/* Account Info */}
          <div
            className={clsx('flex flex-col items-start justify-center', isMobile && 'gap-1')}
            style={isMobile ? { width: 237, height: 96 } : {}}
          >
            <div
              className={clsx(
                'font-inter-tight font-semibold',
                isMobile
                  ? 'text-[24px] leading-[29px] text-[#232323]'
                  : 'text-text-primary text-3xl',
              )}
            >
              {fullName}
            </div>
            <div
              className={clsx(
                'font-inter',
                isMobile
                  ? 'text-[16px] leading-[19px] text-[#555]'
                  : 'text-text-secondary text-base',
              )}
            >
              {effectiveUser.email}
            </div>
          </div>
        </div>
      </div>
      {/* About Button for Mobile */}
      <div className="flex w-full justify-center">
        <button
          className="rounded-lg bg-gray-100 px-6 py-3 font-inter text-base text-gray-700 transition-colors hover:bg-gray-200"
          onClick={() => setShowAboutModal(true)}
        >
          Über Ummah Flow
        </button>
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
      {/* Souks/Services List */}
      <div
        className={clsx('flex w-full flex-col items-start gap-4')}
        style={isMobile ? { width: '100%' } : {}}
      >
        <div
          className={clsx(
            'font-inter-tight font-semibold',
            isMobile ? 'text-[24px] leading-[29px] text-[#232323]' : 'text-2xl',
          )}
        >
          Erstellten Souks / Services
        </div>
        {isLoadingSouks ? (
          <div className="flex w-full items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-2 text-2xl">🔄</div>
              <p className="text-gray-600">Lade Souks...</p>
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              isMobile ? 'grid grid-cols-2 gap-4 px-0' : 'flex flex-wrap justify-center gap-8',
            )}
            style={isMobile ? { width: '100%', minHeight: 200 } : {}}
          >
            {(createdSouks.length > 0 ? createdSouks : []).map((souk) => (
              <div key={souk.souk_id} className={isMobile ? 'w-[164px]' : ''}>
                <CreatedSoukCard
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
                />
              </div>
            ))}
          </div>
        )}
      </div>
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
            <Image
              alt="Profilbild"
              className="rounded-full object-cover"
              height={80}
              src={avatarUrl}
              width={80}
            />
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
            {isLoadingSouks ? (
              <div className="flex w-full items-center justify-center py-8">
                <div className="text-center">
                  <div className="mb-2 text-2xl">🔄</div>
                  <p className="text-gray-600">Lade Souks...</p>
                </div>
              </div>
            ) : createdSouks.length > 0 ? (
              createdSouks.map((souk) => (
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
                />
              ))
            ) : (
              <div className="text-gray-400">Keine Souks erstellt.</div>
            )}
          </div>
        )}
        {activeTab === 'saved' && (
          <div className="flex flex-wrap justify-center gap-8">
            {isLoadingSouks ? (
              <div className="flex w-full items-center justify-center py-8">
                <div className="text-center">
                  <div className="mb-2 text-2xl">🔄</div>
                  <p className="text-gray-600">Lade Souks...</p>
                </div>
              </div>
            ) : savedSouks.length > 0 ? (
              savedSouks.map((souk) => (
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
                />
              ))
            ) : (
              <div className="text-gray-400">Keine Souks gespeichert.</div>
            )}
          </div>
        )}
        {activeTab === 'create' && (
          <div className="flex flex-col items-center">
            <SoukCreateForm />
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
