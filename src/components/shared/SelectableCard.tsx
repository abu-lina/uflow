'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Icon } from '@iconify/react';

import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import { useAuth } from '@/providers/auth-provider';

interface SelectableCardProps {
  imageUrl: string;
  title: string;
  category?: string;
  
  // Optional bottom text (address or donation count)
  bottomText?: string;
  
  // Selection state (for social project selection)
  isSelected?: boolean;
  
  // Action button behavior
  actionType?: 'select' | 'unsave';
  onAction?: () => void;
  
  // Card click
  onClick?: () => void;
  
  // Bookmark removal props (for saved items)
  bookmarkableId?: string;
  bookmarkableType?: 'provider' | 'community_service';
  onRemove?: () => void;
}

export function SelectableCard({
  imageUrl,
  title,
  category,
  bottomText,
  isSelected = false,
  actionType: _actionType = 'select',
  onAction,
  onClick,
  bookmarkableId,
  bookmarkableType,
  onRemove,
}: SelectableCardProps) {
  const { user } = useAuth();
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Use optimistic bookmark hook for bookmark removal
  const { handleBookmark } = useOptimisticBookmark({
    bookmarkableId: bookmarkableId || '',
    bookmarkableType: bookmarkableType || 'provider',
    onBookmarkChange: (isBookmarked) => {
      if (!isBookmarked && onRemove) {
        // Item was removed from bookmarks, notify parent
        onRemove();
      }
    },
  });

  const handleRemoveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If custom onAction is provided, use it
    if (onAction) {
      onAction();
      return;
    }
    
    // If bookmark removal props are provided, handle bookmark removal
    if (bookmarkableId && bookmarkableType && user) {
      setIsRemoving(true);
      try {
        await handleBookmark();
      } catch (error) {
        console.error('Error removing bookmark:', error);
        // Error handling is done in useOptimisticBookmark hook
      } finally {
        setIsRemoving(false);
      }
    }
  };

  // Determine if remove button should be shown
  const showRemoveButton = bookmarkableId && bookmarkableType && user;
  return (
    <div
      className={`relative flex h-[212.5px] w-[160px] md:h-[318.75px] md:w-[240px] cursor-pointer flex-col items-start p-0 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary rounded-2xl ring-offset-2 ring-offset-white' : ''
      }`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative flex h-[145.41px] w-[160px] md:h-[218.12px] md:w-[240px] flex-col justify-between items-center p-0 gap-[5px] rounded-t-2xl overflow-hidden">
        <Image
          alt={title}
          className="h-full w-full rounded-t-2xl object-cover"
          height={145}
          src={imageUrl}
          width={160}
        />
        
        {/* Action Button - Top Right */}
        {showRemoveButton && (
          <div className="absolute right-0 top-0 flex flex-col items-end p-[6.49px] md:p-[9.74px] w-[160px] h-[36.97px] md:w-[240px] md:h-[55.46px]">
            <button
              aria-label={`Remove ${title} from saved items`}
              className="absolute right-2 top-2 md:right-3 md:top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[6px] border border-neutral bg-white/70 backdrop-blur-[1.25px] transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRemoving}
              type="button"
              onClick={handleRemoveClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRemoveClick(e as unknown as React.MouseEvent);
                }
              }}
            >
              {isRemoving ? (
                <Icon 
                  className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-content-heading animate-spin" 
                  icon="material-symbols:refresh"
                />
              ) : (
                <Icon 
                  className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-content-heading" 
                  icon="material-symbols:delete-outline"
                />
              )}
            </button>
          </div>
        )}
        
        {/* Category Badge - Bottom Left */}
        {category && (
          <div className="absolute left-0 bottom-0 flex flex-col justify-end items-start p-[6.49px] md:p-[9.74px]">
            <div className="flex items-center justify-center px-2 py-1 md:px-3 md:py-1.5 h-[22px] md:h-[33px] bg-white/70 border border-neutral backdrop-blur-[1.24px] rounded-[5.96px]">
              <span className="font-inter-tight text-xs md:text-sm font-medium text-content-heading whitespace-nowrap">
                {category}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="flex flex-col items-center p-2 md:p-3 w-[160px] md:w-[240px] h-[67.1px] md:h-[100.65px] bg-white border border-border rounded-b-2xl">
        <div className="flex flex-col items-start gap-2 md:gap-3 w-[144px] md:w-[216px] h-[51.1px] md:h-[76.65px]">
          {/* Title */}
          <div className="flex flex-col items-start gap-[1.5px] w-[144px] md:w-[216px] h-[19px] md:h-[28.5px]">
            <span className="font-inter-tight text-base md:text-xl font-semibold text-content-heading leading-[19px] md:leading-[28.5px] w-[144px] md:w-[216px] h-[19px] md:h-[28.5px] truncate">
              {title}
            </span>
          </div>
          
          {/* Bottom Text (Address or Donation Count) */}
          {bottomText && (
            <div className="flex items-start w-full h-[16.1px] md:h-[24.15px]">
              <span className="font-inter-tight text-xs md:text-sm font-normal text-content truncate">
                {bottomText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

