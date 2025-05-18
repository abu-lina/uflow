'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';

import { SoukCard } from '@/components/shared/SoukCard';
import { SoukDetailModal } from '@/components/shared/SoukDetailModal';
import { getBookmarkedSouks, type Souk } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

export function ProfileContent({ user }: { user: SupabaseUser }) {
  const [bookmarkedSouks, setBookmarkedSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSouk, setSelectedSouk] = useState<Souk | null>(null);
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('saved');

  useEffect(() => {
    setLoading(true);
    const fetchSouks = async () => {
      try {
        const bookmarked = await getBookmarkedSouks(user.id);
        setBookmarkedSouks(
          Array.isArray(bookmarked) && bookmarked.every((s) => s && typeof s.souk_id === 'string')
            ? bookmarked
            : [],
        );
      } catch (error) {
        console.error('Error fetching souks:', error);
      } finally {
        setLoading(false);
      }
    };
    void fetchSouks();
  }, [user.id]);

  // Placeholder user info
  const profile = {
    name: user.user_metadata?.full_name ?? user.email ?? 'Abu Lina',
    avatar: '/icons/icon-muslim.png',
    greeting: 'Möge Allah dich Segnen. Allahuma Barik.',
  };

  const handleCreateSouk = () => {
    // TODO: Implement create souk functionality
    console.log('Create new souk');
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading...</div>;
  }

  const renderSouks = (souks: Souk[]) => {
    if (loading) {
      return <div className="text-uFlowText font-inter-tight text-xl">Lade Souks...</div>;
    }
    if (souks.length === 0) {
      return <div className="text-uFlowText font-inter-tight text-xl">Keine Souks gefunden.</div>;
    }
    return souks.map((souk) => (
      <div
        key={souk.souk_id}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => setSelectedSouk(souk)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedSouk(souk);
          }
        }}
      >
        <SoukCard {...souk} hideWebsiteButton={true} isBookmarked={true} />
      </div>
    ));
  };

  return (
    <div className="mx-auto flex h-[896px] w-[1280px] flex-col items-center gap-10">
      {/* Top Section - Only for Erstellt tab */}
      {activeTab === 'created' ? (
        <div className="flex h-[185px] w-[960px] flex-col items-center gap-[15px]">
          <div className="flex w-full flex-col items-center gap-2">
            <div
              className="h-[18px] w-[273px] text-center font-baskerville text-base font-normal"
              style={{
                background:
                  'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {profile.greeting}
            </div>
            <div className="flex size-[80px] items-center justify-center rounded-[56px] bg-[#589D96]">
              <Image
                alt="Profilbild"
                className="rounded-full object-cover"
                height={68}
                src={profile.avatar}
                width={68}
              />
            </div>
            <div className="flex h-[39px] w-[960px] items-center justify-center text-center font-inter-tight text-3xl font-semibold text-[#232323]">
              {profile.name}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-[960px] flex-col items-center gap-3.5">
          <div className="flex w-full flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="text-center font-baskerville text-base font-normal text-orange-300">
                {profile.greeting}
              </div>
            </div>
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-[56px] bg-slate-500 p-4">
              <div className="relative size-16 overflow-hidden">
                <Image
                  fill
                  alt="Profilbild"
                  className="rounded-full object-cover"
                  sizes="64px"
                  src={profile.avatar}
                />
              </div>
            </div>
            <div className="w-full text-center font-inter-tight text-3xl font-semibold text-content-title">
              {profile.name}
            </div>
          </div>
          <button className="flex h-14 items-center gap-2 overflow-hidden rounded-2xl bg-neutral-300 px-5">
            <span className="text-center font-inter-tight text-xl font-medium text-content-title">
              Profil bearbeiten
            </span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <nav aria-label="Profile sections" className="flex w-full items-center justify-center gap-4">
        <button
          aria-selected={activeTab === 'created'}
          className="group flex h-10 flex-col items-center justify-center gap-1 rounded-xl border-none px-5 text-base font-medium transition-colors hover:bg-[#EEEEEE] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="tab"
          type="button"
          onClick={() => setActiveTab('created')}
        >
          <div className="font-inter text-base font-medium text-[#232323]">Erstellt</div>
          {activeTab === 'created' && <div className="h-0 w-[94px] border border-[#232323]" />}
        </button>
        <button
          aria-selected={activeTab === 'saved'}
          className="group flex h-10 flex-col items-center justify-center gap-1 rounded-xl border-none px-5 text-base font-medium transition-colors hover:bg-[#EEEEEE] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="tab"
          type="button"
          onClick={() => setActiveTab('saved')}
        >
          <div className="font-inter text-base font-medium text-[#232323]">Gespeichert</div>
          {activeTab === 'saved' && <div className="h-0 w-[94px] border border-[#232323]" />}
        </button>
      </nav>

      {/* Cards Grid or Content Section */}
      {activeTab === 'created' ? (
        <div className="flex h-[685px] w-[640px] flex-col items-end gap-4 overflow-y-auto">
          {/* Info Text */}
          <div className="h-[19px] w-[640px] text-center font-inter text-base text-[#555]">
            Fülle alle relevanten Informationen aus.
          </div>
          {/* Form Fields */}
          <div className="flex w-[640px] flex-col items-start gap-4">
            {/* Titel section is first and has scroll margin top for anchor/scrolling */}
            <div className="flex w-[640px] scroll-mt-8 flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">TITEL</div>
              <input
                aria-label="Titel des Souks oder Services"
                autoComplete="off"
                className="w-full rounded-[15px] border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2 font-inter-tight text-base text-content-title transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                id="souk-title"
                name="souk-title"
                placeholder="Titel eingeben"
                type="text"
              />
            </div>
            {/* Category Field */}
            <div className="flex w-[640px] flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">KATEGORIE</div>
              <div className="flex h-10 w-[640px] flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
                <span className="font-inter text-[15px] font-medium text-[#272727]">
                  Kategorie wählen
                </span>
                <Icon className="size-6" icon="line-md:chevron-down" />
              </div>
            </div>
            {/* Description Field */}
            <div className="flex w-[640px] flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">BESCHREIBUNG</div>
              <textarea
                className="h-[160px] w-full rounded-[15px] border border-[#D4D4D4] p-[12px] font-inter text-base"
                placeholder="Beschreibung eingeben"
              />
            </div>
            {/* Street Field */}
            <div className="flex w-[640px] flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">STRASSE</div>
              <div className="flex h-10 w-[640px] flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
                <span className="font-inter text-[15px] font-medium text-[#272727]">
                  Straße eingeben
                </span>
                <Icon className="size-6" icon="ic:baseline-edit" />
              </div>
            </div>
            {/* Zip Field */}
            <div className="flex w-[640px] flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">POSTLEITZAHL</div>
              <div className="flex h-10 w-[640px] flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
                <span className="font-inter text-[15px] font-medium text-[#272727]">
                  PLZ eingeben
                </span>
                <Icon className="size-6" icon="ic:baseline-edit" />
              </div>
            </div>
            {/* City Field */}
            <div className="flex w-[640px] flex-col items-start gap-2">
              <div className="font-inter text-base text-[#999]">STADT</div>
              <div className="flex h-10 w-[640px] flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
                <span className="font-inter text-[15px] font-medium text-[#272727]">
                  Stadt eingeben
                </span>
                <Icon className="size-6" icon="ic:baseline-edit" />
              </div>
            </div>
          </div>
          {/* Action Button */}
          <div className="flex h-8 w-[106.8px] flex-row items-center justify-center gap-[4.8px] rounded-[9.6px] bg-[#CDCDCD] px-4">
            <Icon className="size-4" icon="mynaui:send" />
            <span className="font-inter-tight text-base font-medium text-[#272727]">Senden</span>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center justify-start gap-8">
          {renderSouks(bookmarkedSouks)}
        </div>
      )}

      {/* Action Bar - Only show on Erstellt tab */}
      {activeTab === 'created' && (
        <div className="absolute bottom-10 left-1/2 flex h-[56px] -translate-x-1/2 items-center justify-start gap-2 rounded-[16.8px] border border-[#D4D4D4] bg-white px-2">
          {/* First Button: icon-only */}
          <button
            aria-label="Souk Übersicht"
            className="flex h-10 w-11 items-center justify-center rounded-[12px] bg-white"
            tabIndex={0}
            type="button"
          >
            <Icon
              className="size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#272727]"
              height={20}
              icon="mynaui:store"
              width={20}
            />
          </button>
          {/* Second Button: expanded, selected */}
          <button
            aria-label="Souk / Service registrieren"
            className="flex h-10 items-center justify-center gap-1 rounded-[12px] bg-[#589D96] px-[12px]"
            tabIndex={0}
            type="button"
            onClick={handleCreateSouk}
          >
            <Icon
              className="size-5 min-h-[20px] min-w-[20px] shrink-0 text-white"
              height={20}
              icon="ic:round-plus"
              width={20}
            />
            <span className="flex h-[19px] flex-none items-center justify-center text-center font-inter-tight text-base font-medium text-white">
              Souk / Service registrieren
            </span>
          </button>
        </div>
      )}

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
