import { forwardRef, useState } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
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

export const SoukCard = forwardRef<HTMLDivElement, SoukCardProps>(
  (
    {
      address_street,
      address_zip,
      address_city,
      category,
      gradient = false,
      souk_images,
      barakah_effects = [],
      souk_name,
      souk_id,
      className,
      hideActions = false,
      hideWebsiteButton = false,
      isBookmarked = false,
      onBookmarkChange,
    },
    ref,
  ) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [bookmarked, setBookmarked] = useState(isBookmarked);
    const address = `${address_street}, ${address_zip} ${address_city}`;
    const categoryName = category?.name_de || '';

    const handleBookmark = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) {
        toast.error('Bitte melde dich an, um Souks zu speichern');
        return;
      }

      try {
        setIsLoading(true);
        // First check if the bookmark exists
        const { data: existingBookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('bookmarkable_id', souk_id)
          .eq('bookmarkable_type', 'souk')
          .eq('user_id', user.id)
          .single();

        let newBookmarkState: boolean;
        if (existingBookmark) {
          // If it exists, remove it
          const { error } = await supabase.from('bookmarks').delete().eq('id', existingBookmark.id);
          if (error) {
            throw error;
          }
          newBookmarkState = false;
        } else {
          // If it doesn't exist, add it
          const { error } = await supabase.from('bookmarks').insert({
            bookmarkable_id: souk_id,
            bookmarkable_type: 'souk',
            user_id: user.id,
          });
          if (error) {
            throw error;
          }
          newBookmarkState = true;
        }

        setBookmarked(newBookmarkState);
        onBookmarkChange?.(newBookmarkState);
        toast.success(newBookmarkState ? 'Souk gespeichert' : 'Souk entfernt');
      } catch (error) {
        console.error('Error toggling bookmark:', error);
        toast.error('Fehler beim Speichern des Souks');
      } finally {
        setIsLoading(false);
      }
    };

    function hasUrls(obj: unknown): obj is { urls: string[] } {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray((obj as { urls?: unknown }).urls) &&
        (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
      );
    }

    const getImageUrl = () => {
      try {
        if (!souk_images) {
          return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
        }

        let imagesData: { urls?: string[] } = {};
        if (typeof souk_images === 'string') {
          try {
            imagesData = JSON.parse(souk_images) as { urls?: string[] };
          } catch {
            imagesData = {};
          }
        } else if (Array.isArray(souk_images)) {
          imagesData.urls = souk_images;
        } else if (hasUrls(souk_images)) {
          imagesData = souk_images;
        }

        if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
          return imagesData.urls[0];
        }

        return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
      } catch (error) {
        console.error('Error parsing image data:', error);
        return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
      }
    };

    return (
      <div ref={ref} className={`inline-flex shrink-0 flex-col items-start ${className || ''}`}>
        <div className="relative flex h-64 w-72 flex-col items-center justify-between">
          {gradient ? (
            <div
              className="\ absolute left-0 top-0 flex h-64 w-72 flex-col items-center justify-between
              rounded-t-3xl bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500"
            />
          ) : (
            <div className="border-uFlowWhite absolute left-0 top-0 h-64 w-72 overflow-hidden rounded-t-3xl border">
              <Image
                fill
                alt={souk_name}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 288px"
                src={getImageUrl()}
              />
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            <div className="inline-flex h-6 items-center justify-center overflow-hidden rounded-[0.45rem] bg-white/70 px-2 backdrop-blur-[1.50px]">
              <div className="justify-center text-center font-inter-tight text-sm font-medium text-black">
                {categoryName}
              </div>
            </div>
          </div>
        </div>
        <div
          className="bg-uFlowWhite \ flex w-72 flex-col items-center rounded-b-3xl p-3.5
        outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300"
        >
          <div className="flex w-full flex-col items-start gap-3.5">
            <div className="flex flex-col items-start gap-0.5">
              <span
                className="text-uFlowText truncate font-inter-tight text-xl font-semibold"
                title={souk_name}
              >
                {souk_name}
              </span>
              <span className="text-uFlowText2 font-inter text-sm font-normal">{address}</span>
            </div>
            <div className="flex gap-2">
              {(barakah_effects || []).map((effect: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-1 rounded-lg bg-mint/10 px-2 py-1 text-xs font-medium text-mint"
                >
                  {effect}
                </div>
              ))}
              <span
                className="outline-uFlowDarkGrey text-uFlowText \ flex size-5 items-center justify-center rounded px-2 py-1
              font-inter-tight text-sm font-medium leading-none outline outline-1 outline-offset-[-0.93px]"
              >
                +
              </span>
            </div>
            <div className="my-2 h-px w-full bg-zinc-100" />
            {!hideActions && (
              <div className="flex w-full gap-3.5">
                <Button
                  aria-label={bookmarked ? 'Gespeichert entfernen' : 'Souk speichern'}
                  className="flex-1 gap-1"
                  disabled={isLoading}
                  icon={
                    <div className="relative size-4">
                      <Icon
                        className="text-white"
                        height={16}
                        icon={bookmarked ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                        width={16}
                      />
                    </div>
                  }
                  onClick={handleBookmark}
                >
                  {isLoading ? '...' : bookmarked ? 'Gespeichert' : 'Speichern'}
                </Button>
                {!hideWebsiteButton && (
                  <Button
                    aria-label="Website"
                    className="flex-1 items-center justify-center gap-1.5"
                    icon={
                      <div className="flex items-center">
                        <Icon height={16} icon="mdi:web" width={16} />
                      </div>
                    }
                    variant={gradient ? 'gradient' : 'default'}
                  >
                    Website
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SoukCard.displayName = 'SoukCard';
