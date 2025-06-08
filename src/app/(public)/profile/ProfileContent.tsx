'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import clsx from 'clsx';

import { CreatedSoukCard } from '@/components/shared/CreatedSoukCard';
import { UserNavigationTabs, UserTab } from '@/components/shared/UserNavigationTabs';
import { SoukCreateForm } from '@/features/souks/SoukCreateForm';
import { getCreatedSouks, type Souk, getBookmarkedSouks } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

export function ProfileContent({ user }: { user: SupabaseUser }) {
  const [createdSouks, setCreatedSouks] = useState<Souk[]>([]);
  const [savedSouks, setSavedSouks] = useState<Souk[]>([]);
  const [activeTab, setActiveTab] = useState<UserTab>('created');

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const fetchSouks = async () => {
      const created = await getCreatedSouks(user.id);
      setCreatedSouks(created ?? []);
      const saved = await getBookmarkedSouks(user.id);
      setSavedSouks(saved ?? []);
    };
    void fetchSouks();
  }, [user.id]);

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Unknown User';
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url
      ? user.user_metadata.avatar_url
      : '/icons/icon-muslim.png';

  if (isMobile) {
    return (
      <div
        className={clsx(
          'flex w-full flex-col items-center gap-8',
          'sm:max-w-screen-xl',
          isMobile && 'mx-auto w-[345px] px-6',
          isMobile && 'h-[calc(100vh-64px)] overflow-y-auto pb-4',
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
            className={clsx(
              'flex w-full flex-row items-center justify-center',
              isMobile && 'gap-4',
            )}
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
                {user.email}
              </div>
            </div>
          </div>
        </div>
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
        </div>
      </div>
    );
  }

  // Desktop: tabbed view
  return (
    <div className="flex w-full flex-col items-center gap-8 sm:max-w-screen-xl md:pt-20">
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
            <div className="text-text-secondary font-inter text-base">{user.email}</div>
          </div>
        </div>
      </div>
      <UserNavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-6 w-full">
        {activeTab === 'created' && (
          <div className="flex flex-wrap justify-center gap-8">
            {createdSouks.length > 0 ? (
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
            {savedSouks.length > 0 ? (
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
}
