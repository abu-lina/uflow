'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SoukCard } from '@/components/shared/marketplace/SoukCard';
import { useAuth } from '@/features/auth/context/AuthContext';
import { createServerClient } from '@/lib/database/supabase-server';
import type { Database } from '@/types/database';

type Souk = Database['public']['Tables']['souks']['Row'];

export default function MyBookmarks() {
  const [bookmarks, setBookmarks] = useState<Souk[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createServerClient();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchBookmarks = async () => {
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('bookmarkable_type', 'souk');

      if (bookmarksError) {
        throw bookmarksError;
      }

      const soukIds = bookmarks.map((b) => b.bookmarkable_id);
      const { data: souks } = await supabase.from('souks').select('*').in('souk_id', soukIds);

      setBookmarks(souks || []);
    };

    fetchBookmarks();
  }, [user, router, supabase]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-gray-600">You haven&apos;t bookmarked any souks yet.</p>
          <Link className="text-primary underline hover:text-primary-dark" href="/souks">
            Browse Souks
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((souk) => (
            <SoukCard key={souk.souk_id} souk={souk} />
          ))}
        </div>
      )}
    </div>
  );
}
