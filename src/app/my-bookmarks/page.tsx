'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabase';
import SoukCard from '@/components/core/SoukCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookmarkData {
  id: string;
  bookmarkable_id: string;
}

interface SoukData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  category: string | null;
  status: 'active' | 'inactive';
  price_range: string | null;
  rating: number | null;
  review_count: number;
}

interface BookmarkWithSouk {
  id: string;
  souk: SoukData;
}

export default function MyBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithSouk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // First check if user is authenticated, only runs once on mount
  useEffect(() => {
    // Set a small delay to ensure authentication state is fully loaded
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Then fetch bookmarks if user is authenticated
  useEffect(() => {
    // Only proceed if auth check is complete
    if (!authChecked) return;
    
    const fetchBookmarks = async () => {
      if (!user) {
        setIsLoading(false);
        return; // Don't redirect, we'll show a login message instead
      }

      try {
        setIsLoading(true);
        
        // First get all bookmark IDs
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmarks')
          .select('id, bookmarkable_id')
          .eq('user_id', user.id)
          .eq('bookmarkable_type', 'souk');
        
        if (bookmarkError) throw bookmarkError;
        
        if (!bookmarkData || bookmarkData.length === 0) {
          setBookmarks([]);
          return;
        }
        
        // Then get the souk data
        const soukIds = bookmarkData.map((bookmark: BookmarkData) => bookmark.bookmarkable_id);
        const { data: soukData, error: soukError } = await supabase
          .from('souks')
          .select('*')
          .in('id', soukIds);
          
        if (soukError) throw soukError;
        
        // Combine the data
        const combinedData = bookmarkData.map((bookmark: BookmarkData) => {
          const souk = soukData.find((s: SoukData) => s.id === bookmark.bookmarkable_id);
          return {
            id: bookmark.id,
            souk: souk as SoukData
          };
        }).filter((item: BookmarkWithSouk) => item.souk); // Filter out any where souk wasn't found
          
        setBookmarks(combinedData);
      } catch (err) {
        console.error('Error fetching bookmarks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, authChecked]);

  // If authentication check is not complete, show loading
  if (!authChecked) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Bookmarks</h1>
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
          <p className="mb-4">You need to be logged in to view your bookmarks.</p>
          <Link 
            href={`/auth/login?redirectedFrom=${encodeURIComponent('/my-bookmarks')}`}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Bookmarks</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600">You haven&apos;t bookmarked any souks yet.</p>
          <button 
            onClick={() => router.push('/souk')}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Explore Souks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((bookmark) => (
            <SoukCard
              key={bookmark.id}
              souk={bookmark.souk}
            />
          ))}
        </div>
      )}
    </div>
  );
} 