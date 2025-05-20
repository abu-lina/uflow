'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { SoukCard } from '@/components/shared/SoukCard';
import { SoukDetailModal } from '@/components/shared/SoukDetailModal';
import { SoukCreateForm } from '@/features/souks/SoukCreateForm';
import { getBookmarkedSouks, getCreatedSouks, type Souk } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

import { UserNavigationTabs, type UserTab } from '../../../components/shared/UserNavigationTabs';

export function ProfileContent({ user }: { user: SupabaseUser }) {
  const [activeTab, setActiveTab] = useState<UserTab>('saved');
  const [bookmarkedSouks, setBookmarkedSouks] = useState<Souk[]>([]);
  const [createdSouks, setCreatedSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSouk, setSelectedSouk] = useState<Souk | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchSouks = async () => {
      if (activeTab === 'saved') {
        const bookmarked = await getBookmarkedSouks(user.id);
        setBookmarkedSouks(bookmarked ?? []);
      } else if (activeTab === 'created') {
        const created = await getCreatedSouks(user.id);
        setCreatedSouks(created ?? []);
      }
      setLoading(false);
    };
    void fetchSouks();
  }, [activeTab, user.id]);

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Unknown User';
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url
      ? user.user_metadata.avatar_url
      : '/icons/icon-muslim.png';

  // Always render the greeting/profile block
  return (
    <div className="flex w-full max-w-screen-xl flex-col items-center">
      {/* Greeting/Profile Block - always visible */}
      <div className="flex w-full flex-col items-center">
        {/* Greeting */}
        <div
          className="text-center font-baskerville text-base"
          style={{
            background:
              'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          As-Salamu-Aleikum
        </div>
        <div className="mt-4" />
        {/* Profile Image */}
        <div
          className="flex items-center justify-center rounded-full bg-primary p-4"
          style={{ width: 80, height: 80 }}
        >
          <Image
            alt="Profilbild"
            className="rounded-full object-cover"
            height={80}
            src={avatarUrl}
            width={80}
          />
        </div>
        <div className="mt-2" />
        {/* Full Name */}
        <div className="text-text-primary text-center font-inter-tight text-3xl font-semibold">
          {fullName}
        </div>
        <div className="mt-10" />
      </div>

      {/* Sticky UserNavigationTabs */}
      <div className="sticky top-[120px] z-20 flex w-full justify-center py-2">
        <UserNavigationTabs
          activeTab={activeTab}
          onEditProfile={() => {
            /* handle edit profile */
          }}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content - only this part changes */}
      <div className="mt-8 flex w-full flex-col items-center">
        {loading ? (
          <div className="text-uFlowText font-inter-tight text-xl">Lade Souks...</div>
        ) : activeTab === 'saved' ? (
          bookmarkedSouks.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {bookmarkedSouks.map((souk) => (
                <SoukCard
                  key={souk.souk_id}
                  {...souk}
                  hideWebsiteButton={true}
                  isBookmarked={true}
                  onBookmarkChange={() => {
                    // Optionally update state here
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-uFlowText font-inter-tight text-xl">Keine Souks gefunden.</div>
          )
        ) : activeTab === 'create' ? (
          <SoukCreateForm />
        ) : activeTab === 'created' ? (
          createdSouks.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {createdSouks.map((souk) => (
                <SoukCard key={souk.souk_id} {...souk} hideWebsiteButton={true} />
              ))}
            </div>
          ) : (
            <div className="text-uFlowText font-inter-tight text-xl">
              Keine erstellten Souks gefunden.
            </div>
          )
        ) : null}
      </div>

      {/* Souk Detail Modal */}
      {selectedSouk && (
        <SoukDetailModal
          souk={selectedSouk}
          onBookmarkChange={(soukId, isBookmarked) => {
            if (activeTab === 'saved') {
              setBookmarkedSouks((prev) =>
                isBookmarked ? prev : prev.filter((s) => s.souk_id !== soukId),
              );
            }
          }}
          onClose={() => setSelectedSouk(null)}
        />
      )}
    </div>
  );
}
