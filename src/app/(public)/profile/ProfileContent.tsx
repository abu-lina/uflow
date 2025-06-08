'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import clsx from 'clsx';

import { CreatedSoukCard } from '@/components/shared/CreatedSoukCard';
import { SoukCard } from '@/components/shared/SoukCard';
import { supabase } from '@/lib/supabase/client';
import { getCreatedSouks, type Souk } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

export function ProfileContent({ user }: { user: SupabaseUser }) {
  const [createdSouks, setCreatedSouks] = useState<Souk[]>([]);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const fetchSouks = async () => {
      const created = await getCreatedSouks(user.id);
      setCreatedSouks(created ?? []);
    };
    void fetchSouks();
  }, [user.id]);

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Unknown User';
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url
      ? user.user_metadata.avatar_url
      : '/icons/icon-muslim.png';

  // Always render the greeting/profile block
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
              {user.email}
            </div>
            {/* Buttons Container */}
            <div className="flex gap-2">
              {/* Edit Button */}
              <button
                className={clsx(
                  'flex flex-row items-center justify-center rounded-[9.6px] bg-[#CDCDCD] font-inter-tight font-medium',
                  isMobile
                    ? 'h-8 w-[173.8px] gap-1.5 px-4 py-0 text-[16px] leading-[19px]'
                    : 'h-8 gap-2 px-4 py-0 text-base',
                )}
              >
                <span className="flex items-center">
                  <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                    <path
                      d="M12.13 2.13a2.25 2.25 0 1 1 3.18 3.18l-9.19 9.19a2 2 0 0 1-.9.52l-3.13.78a.5.5 0 0 1-.61-.61l.78-3.13a2 2 0 0 1 .52-.9l9.19-9.19Zm2.12 1.06a.75.75 0 0 0-1.06 0l-.88.88 1.06 1.06.88-.88a.75.75 0 0 0 0-1.06ZM2.98 11.02l-.52 2.09 2.09-.52a1 1 0 0 0 .45-.26l6.97-6.97-1.31-1.31-6.97 6.97a1 1 0 0 0-.26.45Z"
                      fill="#000"
                    />
                  </svg>
                </span>
                <span className="whitespace-nowrap">Konto bearbeiten</span>
              </button>
              {/* Logout Button */}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-[9.6px] bg-[#CDCDCD]"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
              >
                <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path
                    d="M11.333 4.667V3.333A1.333 1.333 0 0 0 10 2H3.333A1.333 1.333 0 0 0 2 3.333v9.334A1.333 1.333 0 0 0 3.333 14H10a1.333 1.333 0 0 0 1.333-1.333v-1.334M10.667 8H5.333M10.667 8l-2-2M10.667 8l-2 2"
                    stroke="#000"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.333"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Souks/Services List */}
      <div
        className={clsx('flex w-full flex-col items-start', isMobile && 'gap-4')}
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
              {isMobile ? (
                <CreatedSoukCard
                  category={souk.category?.name_de || ''}
                  imageUrl={(() => {
                    // Try to extract the first image url from souk.souk_images
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
              ) : (
                <SoukCard {...souk} hideWebsiteButton={true} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
