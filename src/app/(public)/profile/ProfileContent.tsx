'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { SoukCard } from '@/components/shared/SoukCard';
import { getBookmarkedSouks, type Souk } from '@/services/souks';
import type { SupabaseUser } from '@/types/supabase-user';

export function ProfileContent({ user }: { user: SupabaseUser }) {
  const [bookmarkedSouks, setBookmarkedSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [user.id]);

  // Placeholder user info
  const profile = {
    name: user.user_metadata?.full_name ?? user.email ?? 'Abu Lina',
    avatar: '/icons/icon-muslim.png',
    greeting: 'Möge Allah dich Segnen. Allahuma Barik.',
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading...</div>;
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
      <nav aria-label="Profile sections" className="flex w-full items-center justify-center gap-4">
        <button
          aria-selected="false"
          className="group flex h-10 flex-col items-center gap-1 rounded-xl border-none px-5 text-base font-medium transition-colors hover:bg-grey-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="tab"
          type="button"
        >
          <div className="group-hover:text-uFlowText font-inter text-base font-medium text-content transition-colors">
            Erstellt
          </div>
        </button>
        <button
          aria-selected="true"
          className="group flex h-10 flex-col items-center gap-1 rounded-xl border-none px-5 text-base font-medium transition-colors hover:bg-grey-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="tab"
          type="button"
        >
          <div className="text-uFlowText font-inter text-base font-medium">Gespeichert</div>
          <div className="outline-uFlowText h-0 w-full outline outline-1 outline-offset-[-0.5px]" />
        </button>
      </nav>

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
