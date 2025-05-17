'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { SoukCard } from '@/components/shared/SoukCard';
import { SigninModal } from '@/features/auth/components/SigninModal';
import { useAuth } from '@/hooks/useAuth';
import { getBookmarkedSouks, type Souk } from '@/services/souks';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [bookmarkedSouks, setBookmarkedSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSigninModal, setShowSigninModal] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setShowSigninModal(true);
      setLoading(false);
      return;
    }
    setShowSigninModal(false);
    setLoading(true);
    void getBookmarkedSouks(user.id)
      .then((souks) => {
        setBookmarkedSouks(
          Array.isArray(souks) && souks.every((s) => s && typeof s.souk_id === 'string')
            ? souks
            : [],
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, authLoading]);

  // Placeholder user info
  const profile = {
    name: (user?.user_metadata as { name?: string } | undefined)?.name ?? user?.email ?? 'Abu Lina',
    avatar: '/icons/icon-muslim.png',
    greeting: 'Möge Allah dich Segnen. Allahuma Barik.',
  };

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center">Loading...</div>;
  }

  if (showSigninModal) {
    return <SigninModal onClose={() => setShowSigninModal(false)} />;
  }

  return (
    <div className="mx-auto flex w-[1280px] flex-col items-center gap-10 py-12">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="flex w-[960px] flex-col items-center gap-6">
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

      {/* Tabs */}
      <div className="flex w-full items-center justify-center gap-4">
        <div className="flex h-10 flex-col items-center gap-1 rounded-xl px-5 backdrop-blur-[2px]">
          <div className="font-inter text-base font-medium text-content">Erstellt</div>
          <div className="h-0 w-full outline outline-1 outline-offset-[-0.5px]" />
        </div>
        <div className="flex h-10 flex-col items-center gap-1 rounded-xl px-5 backdrop-blur-[2px]">
          <div className="font-inter text-base font-medium text-content">Gespeichert</div>
          <div className="h-0 w-full outline outline-1 outline-offset-[-0.5px] outline-content" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex w-full flex-wrap items-center justify-start gap-8">
        {loading ? (
          <div className="text-uFlowText font-inter-tight text-xl">Lade Bookmarks...</div>
        ) : bookmarkedSouks.length === 0 ? (
          <div className="text-uFlowText font-inter-tight text-xl">Keine Bookmarks gefunden.</div>
        ) : (
          bookmarkedSouks.map((souk) => <SoukCard key={souk.souk_id} {...souk} />)
        )}
      </div>
    </div>
  );
}
