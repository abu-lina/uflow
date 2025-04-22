'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BusinessWithOwner } from '@/types/business';
import BookmarkButton from '@/components/BookmarkButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function BusinessDetailsPage({ params }: { params: { id: string } }) {
  const [business, setBusiness] = useState<BusinessWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch business details using Supabase directly
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select(`
            *,
            owner:users(*)
          `)
          .eq('id', params.id)
          .single();
        
        if (businessError) {
          throw new Error('Failed to fetch business details');
        }
        
        setBusiness(businessData as BusinessWithOwner);
        
        // Check if business is bookmarked - only if user is logged in
        if (user) {
          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', user.id)
            .eq('bookmarkable_id', params.id)
            .eq('bookmarkable_type', 'business');
          
          if (!bookmarkError) {
            setIsBookmarked(bookmarkData.length > 0);
          }
        }
      } catch (err) {
        console.error('Error fetching business details:', err);
        setError('Failed to load business details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinessDetails();
  }, [params.id, user]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }
  
  if (error || !business) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error || 'Business not found'}</span>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/businesses')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Back to Businesses
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Safely access business data
  const owner = business.owner || {};
  const ownerMetaData = owner.raw_user_meta_data || {};
  const hasLogo = !!business.logo_url;
  const hasAvatar = !hasLogo && !!ownerMetaData.avatar_url;
  const profileImageUrl = hasLogo ? business.logo_url : (hasAvatar ? ownerMetaData.avatar_url : null);
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative h-64 sm:h-80 md:h-96 w-full">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={business.name || 'Business'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-6xl">🏢</span>
            </div>
          )}
          
          <div className="absolute top-4 right-4 z-10">
            <BookmarkButton 
              businessId={business.id} 
              isBookmarked={isBookmarked}
            />
          </div>
          
          {business.category && (
            <div className="absolute left-4 top-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-gray-800">
              {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            
            <div className="flex space-x-2">
              <Link
                href="/businesses"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
              >
                Back to List
              </Link>
              
              <Link
                href="/my-bookmarks"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
              >
                My Bookmarks
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">About</h2>
                <p className="text-gray-600">{business.description || 'No description available'}</p>
              </div>
              
              {/* Additional business details would go here */}
              {/* For example: services, products, opening hours, etc. */}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Business Owner</h2>
              <div className="flex items-center mb-4">
                {ownerMetaData.avatar_url ? (
                  <div className="w-16 h-16 relative rounded-full overflow-hidden mr-4">
                    <Image
                      src={ownerMetaData.avatar_url}
                      alt={ownerMetaData.full_name || 'Business Owner'}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <span className="text-gray-400 text-2xl">👤</span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{ownerMetaData.full_name || 'Anonymous Owner'}</h3>
                  <p className="text-gray-500 text-sm">{owner.email || 'No email provided'}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                <p className="text-gray-600">
                  Contact the business owner directly for more information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 