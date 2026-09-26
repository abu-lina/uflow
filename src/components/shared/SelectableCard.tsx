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

  // Background color for the image container (used when showing category fallback images)
  backgroundColor?: string;

  // Optional bottom text (address or donation count)
  bottomText?: string;

  // Optional status badge (e.g. pending review), shown over the image
  statusBadge?: string;

  // Selection state (for social project selection)
  isSelected?: boolean;

  // Action button behavior
  actionType?: 'select' | 'unsave';
  onAction?: () => void;

  // Card click
  onClick?: () => void;

  // Bookmark removal props (for saved items)
  bookmarkableId?: string;
  bookmarkableType?: 'provider';
  onRemove?: () => void;
}

export function SelectableCard({
  imageUrl,
  title,
  category,
  backgroundColor,
  bottomText,
  statusBadge,
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
      className={`relative flex h-[212.5px] w-[160px] cursor-pointer flex-col items-start p-0 transition-all duration-200 md:h-[318.75px] md:w-[240px] ${
        isSelected ? 'rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-white' : ''
      }`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div
        className="relative flex h-[145.41px] w-[160px] flex-col items-center justify-between gap-[5px] overflow-hidden rounded-t-2xl p-0 md:h-[218.12px] md:w-[240px]"
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <Image
          alt={title}
          className="h-full w-full rounded-t-2xl object-cover"
          height={145}
          src={imageUrl}
          width={160}
        />

        {/* Action Button - Top Right */}
        {showRemoveButton && (
          <div className="absolute right-0 top-0 flex h-[36.97px] w-[160px] flex-col items-end p-[6.49px] md:h-[55.46px] md:w-[240px] md:p-[9.74px]">
            <button
              aria-label={`Remove ${title} from saved items`}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[6px] border border-neutral bg-white/70 backdrop-blur-[1.25px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:top-3"
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
                  className="h-[18px] w-[18px] animate-spin text-content-heading md:h-[20px] md:w-[20px]"
                  icon="material-symbols:refresh"
                />
              ) : (
                <Icon
                  className="h-[18px] w-[18px] text-content-heading md:h-[20px] md:w-[20px]"
                  icon="material-symbols:delete-outline"
                />
              )}
            </button>
          </div>
        )}

        {/* Status Badge - Top Left */}
        {statusBadge && (
          <div className="absolute left-0 top-0 flex flex-col items-start p-[6.49px] md:p-[9.74px]">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-inter text-xs font-medium text-amber-700 md:text-sm">
              {statusBadge}
            </span>
          </div>
        )}

        {/* Category Badge - Bottom Left */}
        {category && (
          <div className="absolute bottom-0 left-0 flex flex-col items-start justify-end p-[6.49px] md:p-[9.74px]">
            <div className="flex h-[22px] items-center justify-center rounded-[5.96px] border border-neutral bg-white/70 px-2 py-1 backdrop-blur-[1.24px] md:h-[33px] md:px-3 md:py-1.5">
              <span className="whitespace-nowrap font-inter-tight text-xs font-medium text-content-heading md:text-sm">
                {category}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex h-[67.1px] w-[160px] flex-col items-center rounded-b-2xl border border-border bg-white p-2 md:h-[100.65px] md:w-[240px] md:p-3">
        <div className="flex h-[51.1px] w-[144px] flex-col items-start gap-2 md:h-[76.65px] md:w-[216px] md:gap-3">
          {/* Title */}
          <div className="flex h-[19px] w-[144px] flex-col items-start gap-[1.5px] md:h-[28.5px] md:w-[216px]">
            <span className="h-[19px] w-[144px] truncate font-inter-tight text-base font-semibold leading-[19px] text-content-heading md:h-[28.5px] md:w-[216px] md:text-xl md:leading-[28.5px]">
              {title}
            </span>
          </div>

          {/* Bottom Text (Address or Donation Count) */}
          {bottomText && (
            <div className="flex h-[16.1px] w-full items-start md:h-[24.15px]">
              <span className="truncate font-inter-tight text-xs font-normal text-content md:text-sm">
                {bottomText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
