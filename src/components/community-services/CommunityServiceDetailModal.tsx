import React, { useState, useEffect } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icon } from '@iconify/react';
import { ChevronLeft, ChevronRight, Sparkles, Moon, Building2, Tag, ChevronDown, X } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import { useQuery } from '@tanstack/react-query';
import type { CommunityService } from '@/services/communityServices';
import { getProvidersForCommunityService } from '@/services/communityServices';
import { openNavigation, formatAddress, isAddressNavigable, normalizeWebsiteUrl } from '@/utils/navigationUtils';
import { getAllTrustedImageUrlsWithFallback, type CategoryImages } from '@/utils/imageUtils';

interface CommunityServiceDetailModalProps {
  communityService: CommunityService;
  onClose: () => void;
  onBookmarkChange?: (communityServiceId: string, isBookmarked: boolean) => void;
}

export const CommunityServiceDetailModal: React.FC<CommunityServiceDetailModalProps> = ({
  communityService,
  onClose,
  onBookmarkChange,
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t, language } = useLanguage();
  
  // Use optimistic bookmarking
  const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
    bookmarkableId: communityService.community_service_id,
    bookmarkableType: 'community_service',
    onBookmarkChange: (isBookmarked) => {
      setIsSaved(isBookmarked);
      if (typeof onBookmarkChange === 'function') {
        onBookmarkChange(communityService.community_service_id, isBookmarked);
      }
    },
  });

  // Only allow images from trusted domains
  function isTrustedUrl(url: string) {
    try {
      const { hostname } = new URL(url);
      const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      return hostname === supabaseUrl.hostname;
    } catch {
      return false;
    }
  }

  const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

  const allImageUrls = (() => {
    try {
      if (!communityService.community_service_images || communityService.community_service_images.length === 0) {
        return [PLACEHOLDER_IMAGE];
      }
      const trusted = communityService.community_service_images.filter(isTrustedUrl);
      return trusted.length > 0 ? trusted : [PLACEHOLDER_IMAGE];
    } catch {
      return [PLACEHOLDER_IMAGE];
    }
  })();

  // Use the centralized image swipe hook
  const {
    selectedImageIdx,
    imageContainerRef,
    goToNext,
    goToPrevious,
    goToImage,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getTransformStyle,
  } = useImageSwipe({
    totalImages: allImageUrls.length,
    enableSwipe: true,
    swipeThreshold: 60,
    boundaryResistance: 0.15,
    velocityThreshold: 0.3,
    minSwipeDistance: 30,
  });

  const [expandedAction, setExpandedAction] = useState<'save' | 'share' | 'call' | 'website'>(
    'save',
  );

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState(false);

  // Use React Query for bookmark status (cached, non-blocking)
  const { data: bookmarkedIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('bookmarkable_id, bookmarkable_type')
        .eq('user_id', user.id)
        .eq('bookmarkable_type', 'community_service');
      return bookmarks?.map((b) => b.bookmarkable_id) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Derive bookmark status from cached data
  useEffect(() => {
    if (user && bookmarkedIds.length > 0) {
      setIsSaved(bookmarkedIds.includes(communityService.community_service_id));
    } else if (!user) {
      setIsSaved(false);
    }
  }, [user, bookmarkedIds, communityService.community_service_id]);

  // Use React Query for providers supporting this community service
  const { data: supportingProviders = [] } = useQuery<Array<{ 
    provider_id: string; 
    provider_name: string; 
    provider_images?: string | null;
    address_city?: string;
    category?: { name_de?: string; name_en?: string; category_images?: unknown };
  }>>({
    queryKey: ['providers', 'community-service', communityService.community_service_id],
    queryFn: () => getProvidersForCommunityService(communityService.community_service_id),
    enabled: !!communityService.community_service_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Helper function to get category name based on language
  const getCategoryName = (category: { name_de?: string; name_en?: string } | undefined) => {
    if (!category) return '';
    if (language === 'en') {
      return category.name_en || category.name_de || '';
    } else {
      return category.name_de || category.name_en || '';
    }
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNext, goToPrevious]);

  const handleBookmark = async () => {
    if (!user) {
      // Redirect to bookmark menu (saved page) when not authenticated
      router.push('/saved');
      return;
    }
    
    try {
      await handleOptimisticBookmark();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Action handlers
  const handleExpand = async (action: 'save' | 'share' | 'call' | 'website') => {
    setExpandedAction(action);
    if (action === 'save') {
      void handleBookmark();
    }
    if (action === 'share') {
      const shareUrl = `${window.location.origin}/community-services/${communityService.community_service_id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: communityService.community_service_name,
            text: '',
            url: shareUrl,
          });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.log('Share cancelled or failed:', error);
          }
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link in Zwischenablage kopiert!');
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error('Fehler beim Kopieren des Links');
        }
      }
    } else if (action === 'call') {
      if (!communityService.contact_phone) {
        toast.error('Keine Telefonnummer verfügbar');
        return;
      }
      
      const phoneNumber = communityService.contact_phone.trim();
      const telUrl = `tel:${phoneNumber}`;
      
      const link = document.createElement('a');
      link.href = telUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      try {
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (error) {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        console.error('Failed to open tel link:', error);
        
        try {
          await navigator.clipboard.writeText(phoneNumber);
          toast.success(`Telefonnummer kopiert: ${phoneNumber}`);
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
          toast.error('Fehler beim Öffnen der Telefonnummer');
        }
      }
    } else if (action === 'website' && communityService.social_website) {
      const url = normalizeWebsiteUrl(communityService.social_website);
      if (url) window.open(url, '_blank');
    }
  };

  // Transform community service to provider format for mobile view
  const providerForMobile = {
    provider_id: communityService.community_service_id,
    provider_name: communityService.community_service_name,
    provider_images: communityService.community_service_images ? JSON.stringify({ urls: communityService.community_service_images }) : null,
    category_id: communityService.category_id || null,
    address_city: communityService.address_city || null,
    social_website: communityService.social_website || null,
    social_instagram: communityService.social_instagram || null,
    contact_email: communityService.contact_email || null,
    contact_phone: communityService.contact_phone || null,
    address_street: communityService.address_street || null,
    address_country: communityService.address_country || null,
    address_zip: communityService.address_zip || null,
    location_latitude: communityService.location_latitude || null,
    location_longitude: communityService.location_longitude || null,
    created_at: communityService.created_at,
    updated_at: communityService.updated_at,
    barakah_effects: communityService.barakah_effects || [],
    offers_ids: communityService.offers_ids || [],
    needs_ids: communityService.needs_ids || [],
    offers: communityService.offers || [],
    needs: communityService.needs || [],
    category: communityService.category ? {
      name_de: communityService.category.name_de || communityService.category.name_en || '',
      name_en: communityService.category.name_en,
      category_images: communityService.category.category_images,
    } : undefined,
    community_service_id: communityService.community_service_id,
  };

  // Render mobile version for mobile devices
  if (isMobile) {
    return (
      <Modal isOpen={true} title={communityService.community_service_name} onClose={onClose}>
        <div className="w-full max-w-sm">
          <MobileProviderDetail provider={providerForMobile} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} title={communityService.community_service_name} onClose={onClose}>
      <section
        aria-modal="true"
        className="relative flex h-[900px] w-[1200px] cursor-default bg-transparent"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Section */}
        <div className="absolute left-0 top-0 inline-flex h-[900px] w-[704px] flex-col items-start justify-start gap-8 rounded-l-[48px] bg-white py-10 pl-12 pr-4">
          {/* Title & Subtitle */}
          <div className="flex flex-col items-start justify-start gap-2 self-stretch">
            <div className="inline-flex items-center justify-start gap-8 self-stretch">
              <div className="text-uFlowText justify-start font-inter-tight text-3xl font-bold">
                {communityService.community_service_name}
              </div>
            </div>
            {formatAddress(communityService.address_street ?? undefined, communityService.address_zip ?? undefined, communityService.address_city ?? undefined) ? (
              <button
                className="text-uFlowText2 justify-start self-stretch font-inter text-base font-normal hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-uFlowText2 disabled:hover:no-underline text-left"
                disabled={!isAddressNavigable(communityService.address_street ?? undefined, communityService.address_zip ?? undefined, communityService.address_city ?? undefined)}
                title="Adresse antippen zum Navigieren"
                onClick={() => {
                  const address = formatAddress(communityService.address_street ?? undefined, communityService.address_zip ?? undefined, communityService.address_city ?? undefined);
                  if (isAddressNavigable(communityService.address_street ?? undefined, communityService.address_zip ?? undefined, communityService.address_city ?? undefined)) {
                    openNavigation(address);
                  }
                }}
              >
                {formatAddress(communityService.address_street ?? undefined, communityService.address_zip ?? undefined, communityService.address_city ?? undefined)}
              </button>
            ) : (
              <div className="text-uFlowText2 justify-start self-stretch font-inter text-base font-normal">
                {communityService.category?.name_de || ''}
              </div>
            )}
          </div>
          {/* Enhanced Image Carousel */}
          <div className="flex h-[640px] flex-col items-start justify-start gap-4">
            <div className="relative">
              {/* Main Image Container with Swipe Support */}
              <div
                ref={imageContainerRef}
                className="bg-uFlowAccent relative h-[480px] w-[640px] overflow-hidden rounded-[32px]"
                data-testid="image-container"
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
              >
                {/* Image Carousel Container */}
                <div
                  className="flex h-full w-full"
                  style={getTransformStyle()}
                >
                  {allImageUrls.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative h-full w-full flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      <Image
                        fill
                        alt={`${communityService.community_service_name} ${index + 1}`}
                        className="rounded-[32px] object-cover"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        priority={index === 0}
                        sizes="(max-width: 768px) 100vw, 640px"
                        src={imageUrl}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {allImageUrls.length > 1 && (
                  <>
                    {selectedImageIdx > 0 && (
                      <button
                        aria-label="Vorheriges Bild"
                        className="absolute left-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPrevious();
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {selectedImageIdx < allImageUrls.length - 1 && (
                      <button
                        aria-label="Nächstes Bild"
                        className="absolute right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToNext();
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Thumbnails */}
            {allImageUrls.length > 1 && (
              <div className="flex items-start gap-4" style={{ gap: '16px' }}>
                {allImageUrls.map((img, i) => (
                  <button
                    key={i}
                    aria-label={`Bild ${i + 1} auswählen`}
                    className={`relative overflow-hidden rounded-[8px] border-2 transition-all hover:scale-105 ${
                      selectedImageIdx === i ? 'scale-105 border-primary' : 'border-transparent'
                    }`}
                    style={{ width: 80, height: 60 }}
                    type="button"
                    onClick={() => goToImage(i)}
                  >
                    <Image
                      fill
                      alt={`${communityService.community_service_name} thumbnail ${i + 1}`}
                      className="rounded-[8px] object-cover"
                      src={img}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Right Section */}
        <div className="absolute left-[704px] top-0 inline-flex h-[900px] w-[496px] flex-col items-start justify-start gap-4 rounded-r-[48px] bg-white py-36 pl-4 pr-12">
          {/* Close Button */}
          <button
            aria-label="Schließen"
            className="absolute right-12 top-9 flex size-10 items-center justify-center rounded-full text-content transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="size-5" />
          </button>
          <div className="flex h-[640px] flex-col items-start justify-start gap-8 self-stretch">
            {/* Barakah Effects Section */}
            {communityService.barakah_effects && communityService.barakah_effects.length > 0 && (
              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
                <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                  <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                    {t('providers.ourBarakahEffect')}:
                  </div>
                  <div className="flex min-h-[120px] flex-col flex-wrap items-start gap-2">
                    {communityService.barakah_effects.map((effect, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 rounded border border-[#CDCDCD] bg-white px-3 py-1 font-inter-tight text-[16px] font-medium text-[#232323] shadow-sm"
                      >
                        {effect === 'Iman' && <Sparkles className="h-4 w-4 text-gray-600" />}
                        {effect === 'Zakat' && <Moon className="h-4 w-4 text-gray-600" />}
                        {effect === 'Sunnah' && <Building2 className="h-4 w-4 text-gray-600" />}
                        {!(effect === 'Iman' || effect === 'Zakat' || effect === 'Sunnah') && (
                          <Tag className="h-4 w-4 text-gray-600" />
                        )}
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Supporting Providers Section */}
            {supportingProviders.length > 0 && (
              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
                <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedProviders(!expandedProviders)}
                  >
                    <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                      Supporters
                    </div>
                    <ChevronDown 
                      className={`h-6 w-6 text-gray-600 transition-transform ${
                        expandedProviders ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  {expandedProviders && (
                    <div>
                      {supportingProviders.map((provider) => {
                        const providerImageUrls = getAllTrustedImageUrlsWithFallback(
                          provider.provider_images,
                          provider.category?.category_images as CategoryImages
                        );
                        const providerImage = providerImageUrls.length > 0 ? providerImageUrls[0] : PLACEHOLDER_IMAGE;
                        
                        return (
                          <button
                            key={provider.provider_id}
                            className="flex w-full items-center gap-4 rounded-lg py-2 pr-2 pl-0 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                            onClick={() => {
                              onClose();
                              router.push(`/providers/${provider.provider_id}`);
                            }}
                          >
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                              <Image
                                fill
                                alt={provider.provider_name}
                                className="object-cover"
                                src={providerImage}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-inter-tight font-semibold text-content">
                                {provider.provider_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {getCategoryName(provider.category)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Offers & Needs Section */}
            {((communityService.offers && communityService.offers.length > 0) || (communityService.needs && communityService.needs.length > 0)) && (
              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
                <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                  {/* Offers Section */}
                  {communityService.offers && communityService.offers.length > 0 && (
                    <div className="flex w-full flex-col gap-2.5">
                      <button
                        className="flex w-full items-center justify-between"
                        onClick={() => setExpandedOffers(!expandedOffers)}
                      >
                        <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                          {t('providers.weOffer')}
                        </div>
                        <ChevronDown 
                          className={`h-6 w-6 text-gray-600 transition-transform ${
                            expandedOffers ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {expandedOffers && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {communityService.offers.map((offer, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                              >
                                {offer.name_de}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  {communityService.offers && communityService.offers.length > 0 && communityService.needs && communityService.needs.length > 0 && (
                    <hr className="w-full border-gray-200" />
                  )}

                  {/* Needs Section */}
                  {communityService.needs && communityService.needs.length > 0 && (
                    <div className="flex w-full flex-col gap-2.5">
                      <button
                        className="flex w-full items-center justify-between"
                        onClick={() => setExpandedNeeds(!expandedNeeds)}
                      >
                        <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                          {t('providers.weAreLookingFor')}
                        </div>
                        <ChevronDown 
                          className={`h-6 w-6 text-gray-600 transition-transform ${
                            expandedNeeds ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      {expandedNeeds && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {communityService.needs.map((need, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                              >
                                {need.name_de}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Actions Bar */}
        <div className="absolute bottom-10 left-1/2 flex h-[56px] w-auto -translate-x-1/2 items-center gap-0 rounded-[16.8px] border border-[#EEEEEE] bg-white px-2">
          {/* Save Button */}
          <button
            aria-expanded={expandedAction === 'save'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'save' ? 'w-auto gap-1 bg-primary hover:bg-primary-dark active:bg-primary-darker px-3' : 'w-11 bg-transparent px-3'}`}
            type="button"
            onClick={() => handleExpand('save')}
          >
            <Icon
              className={
                expandedAction === 'save'
                  ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-white'
                  : isSaved
                    ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-black'
                    : 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#333333]'
              }
              height={20}
              icon={
                expandedAction === 'save'
                  ? isSaved
                    ? 'iconamoon:heart-fill'
                    : 'iconamoon:heart'
                  : isSaved
                    ? 'iconamoon:heart-fill'
                    : 'iconamoon:heart'
              }
              width={20}
            />
            {expandedAction === 'save' && (
              <span className="font-inter-tight text-base font-medium text-white">
                {isSaved ? t('providers.saved') : t('providers.save')}
              </span>
            )}
          </button>
          {/* Share Button */}
          <button
            aria-expanded={expandedAction === 'share'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'share' ? 'w-auto gap-1 bg-primary hover:bg-primary-dark active:bg-primary-darker px-3' : 'w-11 bg-transparent px-3'}`}
            type="button"
            onClick={() => handleExpand('share')}
          >
            <Icon
              className={
                expandedAction === 'share'
                  ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-white'
                  : 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#333333]'
              }
              height={20}
              icon="material-symbols:share"
              width={20}
            />
            {expandedAction === 'share' && (
              <span className="font-inter-tight text-base font-medium text-white">Teilen</span>
            )}
          </button>
          {/* Phone Button */}
          <button
            aria-expanded={expandedAction === 'call'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'call' ? 'w-auto gap-1 bg-primary hover:bg-primary-dark active:bg-primary-darker px-3' : 'w-11 bg-transparent px-3'}`}
            type="button"
            onClick={() => handleExpand('call')}
          >
            <Icon
              className={
                expandedAction === 'call'
                  ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-white'
                  : 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#272727]'
              }
              height={20}
              icon="entypo:old-phone"
              width={20}
            />
            {expandedAction === 'call' && (
              <span className="font-inter-tight text-base font-medium text-white">Anrufen</span>
            )}
          </button>
          {/* Website Button */}
          <button
            aria-expanded={expandedAction === 'website'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'website' ? 'w-auto gap-1 bg-primary hover:bg-primary-dark active:bg-primary-darker px-3' : 'w-11 bg-transparent px-3'}`}
            type="button"
            onClick={() => handleExpand('website')}
          >
            <Icon
              className={
                expandedAction === 'website'
                  ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-white'
                  : 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#272727]'
              }
              height={20}
              icon="mdi:internet"
              width={20}
            />
            {expandedAction === 'website' && (
              <span className="font-inter-tight text-base font-medium text-white">Website</span>
            )}
          </button>
        </div>
      </section>
    </Modal>
  );
};

