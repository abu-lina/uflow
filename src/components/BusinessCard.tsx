import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BusinessWithOwner } from '@/types/business';
import BookmarkButton from './BookmarkButton';

interface BusinessCardProps {
  business: BusinessWithOwner;
  isBookmarked?: boolean;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business, isBookmarked = false }) => {
  // Safely access business data
  const businessName = business.name || 'Unnamed Business';
  const businessDescription = business.description || 'No description available';
  
  // Safely access owner data (owner might be null or undefined)
  const owner = business.owner || {};
  const ownerMetaData = owner.raw_user_meta_data || {};
  const ownerName = ownerMetaData.full_name || 'Anonymous Owner';

  // Use business logo or owner avatar or default
  const hasLogo = !!business.logo_url;
  const hasAvatar = !hasLogo && !!ownerMetaData.avatar_url;
  const profileImageUrl = hasLogo ? business.logo_url : (hasAvatar ? ownerMetaData.avatar_url : null);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
      <BookmarkButton businessId={business.id} isBookmarked={isBookmarked} />
      
      <Link href={`/businesses/${business.id}`}>
        <div className="relative h-48 w-full">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={businessName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-4xl">🏢</span>
            </div>
          )}
          
          {business.category && (
            <div className="absolute left-2 bottom-2 bg-gray-100/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-gray-800">
              {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{businessName}</h3>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{businessDescription}</p>
          <div className="flex items-center text-sm text-gray-500">
            <span>Owner: {ownerName}</span>
            {business.is_verified && (
              <span className="ml-2 text-blue-500">✓ Verified</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BusinessCard; 