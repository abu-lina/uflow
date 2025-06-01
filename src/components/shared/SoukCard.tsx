import { forwardRef, useState, useEffect } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { Souk } from '@/services/souks';
import { safeJsonParse } from '@/utils/json';

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
    useEffect(() => {
      setBookmarked(isBookmarked);
    }, [isBookmarked]);
    let address = '';
    if (address_street && address_zip && address_city) {
      address = `${address_street}, ${address_zip} ${address_city}`;
    } else if (address_street && address_city) {
      address = `${address_street}, ${address_city}`;
    } else if (address_zip && address_city) {
      address = `${address_zip} ${address_city}`;
    } else if (address_city) {
      address = address_city;
    }
    const categoryName = category?.name_de || '';

    const handleBookmark = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) {
        toast.error('Bitte melde dich an, um Souks zu speichern');
        return;
      }
      try {
        setIsLoading(true);
        const { data: existingBookmark, error: fetchError } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('bookmarkable_id', souk_id)
          .eq('bookmarkable_type', 'souk')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingBookmark) {
          const { error: deleteError } = await supabase
            .from('bookmarks')
            .delete()
            .eq('id', existingBookmark.id);
          if (deleteError) throw deleteError;
          setBookmarked(false);
          onBookmarkChange?.(false);
          toast.success('Souk entfernt');
        } else {
          const { error: insertError } = await supabase.from('bookmarks').insert({
            bookmarkable_id: souk_id,
            bookmarkable_type: 'souk',
            user_id: user.id,
          });
          if (insertError) throw insertError;
          setBookmarked(true);
          onBookmarkChange?.(true);
          toast.success('Souk gespeichert');
        }
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
          return '/images/placeholder.jpg';
        }

        let imagesData: { urls?: string[] } = {};
        if (typeof souk_images === 'string') {
          const parsed = safeJsonParse<{ urls?: string[] }>(
            souk_images,
            (parsed): parsed is { urls?: string[] } => {
              return (
                typeof parsed === 'object' &&
                parsed !== null &&
                'urls' in parsed &&
                Array.isArray(parsed.urls)
              );
            },
          );
          if (parsed) {
            imagesData = parsed;
          }
        } else if (Array.isArray(souk_images)) {
          imagesData.urls = souk_images;
        } else if (hasUrls(souk_images)) {
          imagesData = souk_images;
        }

        if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
          return imagesData.urls[0];
        }

        return '/images/placeholder.jpg';
      } catch (error) {
        console.error('Error parsing image data:', error);
        return '/images/placeholder.jpg';
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
            <div className="inline-flex h-6 items-center justify-center overflow-hidden rounded-[7.2px] border border-[#CDCDCD] bg-white/70 px-2 backdrop-blur-[1.50px]">
              <div className="justify-center text-center font-inter-tight text-sm font-medium text-[#333333]">
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
                className="truncate font-inter-tight text-xl font-semibold text-[#333333]"
                title={souk_name}
              >
                {souk_name}
              </span>
              <span className="text-uFlowText2 font-inter text-sm font-normal">{address}</span>
            </div>
            {barakah_effects && barakah_effects.length > 0 && (
              <div className="flex h-7 w-full items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                  {(barakah_effects || []).slice(0, 2).map((effect: string, index: number) => (
                    <div
                      key={index}
                      className="flex shrink-0 items-center rounded-[4.9px] border border-[#CDCDCD] bg-white/80 px-1 py-0.5 backdrop-blur-sm"
                    >
                      <span className="font-inter-tight text-sm font-medium text-[#232323]">
                        {effect}
                      </span>
                    </div>
                  ))}
                  {barakah_effects && barakah_effects.length > 2 && (
                    <div className="flex shrink-0 items-center rounded-[4.9px] border border-[#CDCDCD] bg-white/80 px-1 py-0.5 backdrop-blur-sm">
                      <span className="font-inter-tight text-sm font-medium text-[#232323]">
                        +{barakah_effects.length - 2}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
