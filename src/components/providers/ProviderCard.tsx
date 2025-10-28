import { forwardRef, useState, useEffect } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import type { Provider } from '@/services/providers';
import { safeJsonParse } from '@/utils/json';
import { openNavigation, isAddressNavigable } from '@/utils/navigationUtils';

interface ProviderCardProps extends Omit<Provider, 'id' | 'category_id'> {
  className?: string;
  gradient?: boolean;
  hideActions?: boolean;
  hideWebsiteButton?: boolean;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  bookmarkableType?: 'provider' | 'community_service';
}

export const ProviderCard = forwardRef<HTMLDivElement, ProviderCardProps>(
  (
    {
      address_street,
      address_zip,
      address_city,
      category,
      gradient = false,
      provider_images,
      barakah_effects = [],
      provider_name,
      provider_id,
      className,
      hideActions = false,
      hideWebsiteButton = false,
      isBookmarked = false,
      onBookmarkChange,
      bookmarkableType = 'provider',
    },
    ref,
  ) => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [bookmarked, setBookmarked] = useState(isBookmarked);
    const [showAllahumaBarik, setShowAllahumaBarik] = useState(false);
    
    // Use optimistic bookmarking
    const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
      bookmarkableId: provider_id,
      bookmarkableType,
      onBookmarkChange: (isBookmarked) => {
        setBookmarked(isBookmarked);
        onBookmarkChange?.(isBookmarked);
      },
    });
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
    } else {
      // No address means online business
      address = t('providers.online');
    }
    
    // Get category name based on current language
    const getCategoryName = () => {
      if (!category) return t('search.unnamed');
      if (language === 'en') {
        return category.name_en || category.name_de || t('search.unnamed');
      } else {
        return category.name_de || category.name_en || t('search.unnamed');
      }
    };
    const categoryName = getCategoryName();

    const handleBookmark = async (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!user) {
        // Show login prompt
        return;
      }
      
      if (!bookmarked) {
        setShowAllahumaBarik(true);
        setTimeout(() => {
          setShowAllahumaBarik(false);
        }, 900);
      }
      
      setIsLoading(true);
      try {
        await handleOptimisticBookmark();
      } catch (error) {
        console.error('Error toggling bookmark:', error);
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
        // Priority 1: Provider images
        if (provider_images) {
          let imagesData: { urls?: string[] } = {};
          if (typeof provider_images === 'string') {
            const parsed = safeJsonParse<{ urls?: string[] }>(
              provider_images,
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
          } else if (Array.isArray(provider_images)) {
            imagesData.urls = provider_images;
          } else if (hasUrls(provider_images)) {
            imagesData = provider_images;
          }

          if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
            return imagesData.urls[0];
          }
        }

        // Priority 2: Category fallback images
        if (category?.category_images) {
          try {
            let parsedCategoryImages;
            
            if (typeof category.category_images === 'string') {
              parsedCategoryImages = JSON.parse(category.category_images);
            } else {
              parsedCategoryImages = category.category_images;
            }
            
            // Handle different possible structures
            if (Array.isArray(parsedCategoryImages) && parsedCategoryImages.length > 0) {
              // Direct array of URLs
              return parsedCategoryImages[0];
            } else if (parsedCategoryImages.urls && Array.isArray(parsedCategoryImages.urls) && parsedCategoryImages.urls.length > 0) {
              // Object with urls property
              return parsedCategoryImages.urls[0];
            } else if (parsedCategoryImages.url) {
              // Single URL
              return parsedCategoryImages.url;
            }
          } catch (err) {
            console.warn('Error parsing category images in ProviderCard:', err);
          }
        }

        // Priority 3: Placeholder
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
                alt={provider_name}
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
          className="flex w-72 flex-col items-center rounded-b-3xl bg-white p-3.5
        outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300"
        >
          <div className="flex w-full flex-col items-start gap-3.5">
            <div className="flex w-full min-w-0 flex-col items-start gap-0.5">
              <span
                className="w-full min-w-0 truncate font-inter-tight text-xl font-semibold text-[#333333]"
                title={provider_name}
              >
                {provider_name}
              </span>
              <button
                className="w-full min-w-0 truncate text-uFlowText2 font-inter text-sm font-normal hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-uFlowText2 disabled:hover:no-underline text-left"
                disabled={!isAddressNavigable(address_street ?? undefined, address_zip ?? undefined, address_city ?? undefined)}
                title={address ? `${address} - ${t('providers.addressTapToNavigate')}` : ''}
                onClick={() => {
                  if (isAddressNavigable(address_street ?? undefined, address_zip ?? undefined, address_city ?? undefined)) {
                    openNavigation(address);
                  }
                }}
              >
                {address}
              </button>
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
                  aria-label={bookmarked ? 'Gespeichert entfernen' : 'Provider speichern'}
                  className={`flex-1 gap-1 ${showAllahumaBarik ? 'border border-[#D2B581] bg-white' : ''}`}
                  disabled={isLoading}
                  icon={
                    <div className="relative size-4">
                      <Icon
                        className={showAllahumaBarik ? 'text-[#D2B581]' : 'text-white'}
                        height={16}
                        icon={bookmarked ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                        width={16}
                      />
                    </div>
                  }
                  onClick={handleBookmark}
                >
                  {isLoading ? (
                    '...'
                  ) : showAllahumaBarik ? (
                    <span className="bg-gold-gradient bg-clip-text text-transparent">
                      Allahuma Barik
                    </span>
                  ) : bookmarked ? (
                    t('providers.saved')
                  ) : (
                    t('providers.save')
                  )}
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

ProviderCard.displayName = 'ProviderCard';
