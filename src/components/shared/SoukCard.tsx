'use client';

import { forwardRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { Souk } from '@/services/souks';

interface SoukCardProps extends Omit<Souk, 'id' | 'category_id'> {
  className?: string;
  gradient?: boolean;
  hideActions?: boolean;
  hideWebsiteButton?: boolean;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

const DEFAULT_IMAGE_URL =
  'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';

const CARD_BASE_STYLES =
  'relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md';

export const SoukCard = forwardRef<HTMLDivElement, SoukCardProps>(
  (
    {
      className = '',
      gradient = false,
      hideActions = false,
      hideWebsiteButton = false,
      isBookmarked = false,
      onBookmarkChange,
      ...props
    },
    ref,
  ) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleBookmark = async () => {
      if (!user) {
        toast.error('Bitte melde dich an, um Souks zu speichern');
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase.from('bookmarks').upsert({
          user_id: user.id,
          bookmarkable_id: props.souk_id,
          bookmarkable_type: 'souk',
        });

        if (error) {
          throw error;
        }

        onBookmarkChange?.(!isBookmarked);
        toast.success(isBookmarked ? 'Souk entfernt' : 'Souk gespeichert');
      } catch (error) {
        console.error('Error toggling bookmark:', error);
        toast.error('Fehler beim Speichern des Souks');
      } finally {
        setIsLoading(false);
      }
    };

    const getImageUrl = () => {
      try {
        if (!props.souk_images) {
          return DEFAULT_IMAGE_URL;
        }

        if (Array.isArray(props.souk_images) && props.souk_images.length > 0) {
          return props.souk_images[0];
        }

        return DEFAULT_IMAGE_URL;
      } catch (error) {
        console.error('Error parsing image data:', error);
        return DEFAULT_IMAGE_URL;
      }
    };

    return (
      <div ref={ref} className={`${CARD_BASE_STYLES} ${className}`}>
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            fill
            priority
            alt={props.souk_name}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={getImageUrl()}
          />
          {gradient && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 text-lg font-semibold">{props.souk_name}</h3>
          <p className="mb-4 text-sm text-gray-600">{props.souk_description}</p>

          {/* Actions */}
          {!hideActions && (
            <div className="flex items-center justify-between">
              <Button
                className="flex items-center space-x-2"
                disabled={isLoading}
                variant="ghost"
                onClick={handleBookmark}
              >
                <Icon
                  className="size-5"
                  icon={isBookmarked ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                />
                <span>{isBookmarked ? 'Gespeichert' : 'Speichern'}</span>
              </Button>

              {!hideWebsiteButton && props.social_website && (
                <Link
                  className="inline-flex items-center justify-center space-x-2 rounded-[9.60px] bg-mint px-4 py-2 text-base font-medium text-white hover:bg-mint/90"
                  href={props.social_website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon className="size-5" icon="mdi:web" />
                  <span>Website</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

SoukCard.displayName = 'SoukCard';
