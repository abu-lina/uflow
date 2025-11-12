import React, { useState, useEffect } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { X, ChevronLeft, ChevronRight, Sparkles, Moon, Building2, Tag } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import { useQuery } from '@tanstack/react-query';
import type { Provider } from '@/services/providers';
import { getCommunityServicesForProvider, type CommunityServiceData } from '@/services/community_services';
import { openNavigation, formatAddress, isAddressNavigable, normalizeWebsiteUrl } from '@/utils/navigationUtils';

interface ProviderDetailModalProps {
  provider: Provider;
  onClose: () => void;
  onBookmarkChange?: (providerId: string, isBookmarked: boolean) => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  onClose,
  onBookmarkChange,
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  
  // Use optimistic bookmarking
  const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
    bookmarkableId: provider.provider_id,
    bookmarkableType: 'provider',
    onBookmarkChange: (isBookmarked) => {
      setIsSaved(isBookmarked);
      if (typeof onBookmarkChange === 'function') {
        onBookmarkChange(provider.provider_id, isBookmarked);
      }
    },
  });
  function hasUrls(obj: unknown): obj is { urls: string[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      Array.isArray((obj as { urls?: unknown }).urls) &&
      (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
    );
  }

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
      if (!provider.provider_images) {
        return [PLACEHOLDER_IMAGE];
      }
      let imagesData: { urls?: string[] } = {};
      if (typeof provider.provider_images === 'string') {
        try {
          imagesData = JSON.parse(provider.provider_images) as { urls?: string[] };
        } catch {
          imagesData = {};
        }
      } else if (Array.isArray(provider.provider_images)) {
        imagesData.urls = provider.provider_images;
      } else if (hasUrls(provider.provider_images)) {
        imagesData = provider.provider_images;
      }
      if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
        const trusted = imagesData.urls.filter(isTrustedUrl);
        return trusted.length > 0 ? trusted : [PLACEHOLDER_IMAGE];
      }
      return [PLACEHOLDER_IMAGE];
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

  // Debug selected image changes
  useEffect(() => {
    console.log(
      'Selected image changed to:',
      selectedImageIdx,
      'URL:',
      allImageUrls[selectedImageIdx],
    );
  }, [selectedImageIdx, allImageUrls]);

  const [expandedAction, setExpandedAction] = useState<'save' | 'share' | 'call' | 'website'>(
    'save',
  );

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [communityServices, setCommunityServices] = useState<CommunityServiceData[]>([]);

  // Use React Query for bookmark status (cached, non-blocking)
  // This uses the same cache as the bookmarks list, so it's instant if already loaded
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('bookmarkable_id, bookmarkable_type')
        .eq('user_id', user.id);
      return bookmarks?.map((b) => b.bookmarkable_id) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Show cached data immediately
  });

  // Derive bookmark status from cached data (instant, no network request)
  useEffect(() => {
    if (user && bookmarkedProviderIds.length > 0) {
      setIsSaved(bookmarkedProviderIds.includes(provider.provider_id));
    } else if (!user) {
      setIsSaved(false);
    }
  }, [user, bookmarkedProviderIds, provider.provider_id]);

  // Use React Query for community services (cached, non-blocking)
  const { data: communityServicesData = [] } = useQuery({
    queryKey: ['community-services', 'provider', provider.provider_id],
    queryFn: () => getCommunityServicesForProvider(provider.provider_id),
    enabled: !!provider.provider_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData, // Show cached data immediately
  });

  // Update state when data changes
  useEffect(() => {
    setCommunityServices(communityServicesData);
  }, [communityServicesData]);

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
      // Show login prompt
      return;
    }
    
    try {
      await handleOptimisticBookmark();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Action handlers
  const handleExpand = (action: 'save' | 'share' | 'call' | 'website') => {
    setExpandedAction(action);
    if (action === 'save') {
      void handleBookmark();
    }
    if (action === 'share') {
      const shareUrl = `${window.location.origin}/providers/${provider.provider_id}`;
      if (navigator.share) {
        void navigator.share({
          title: provider.provider_name,
          text: '',
          url: shareUrl,
        });
      } else {
        void navigator.clipboard.writeText(shareUrl);
      }
    } else if (action === 'call' && provider.contact_phone) {
      window.open(`tel:${provider.contact_phone}`);
    } else if (action === 'website' && provider.social_website) {
      const url = normalizeWebsiteUrl(provider.social_website);
      if (url) window.open(url, '_blank');
    }
  };

  // Render mobile version for mobile devices
  if (isMobile) {
    return (
      <Modal isOpen={true} title={provider.provider_name} onClose={onClose}>
        <div className="w-full max-w-sm">
          <MobileProviderDetail provider={provider} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} title={communityServices[0]?.community_service_name || provider.provider_name} onClose={onClose}>
      <section
        aria-modal="true"
        className="relative flex h-[900px] w-[1200px] cursor-default bg-transparent"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Top Right */}
        <button
          aria-label="Schließen"
          className="absolute right-6 top-6 z-50 flex size-10 items-center justify-center rounded-full bg-white/80 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          type="button"
          onClick={onClose}
        >
          <X className="text-uFlowText size-5" size={28} />
        </button>
        {/* Left Section */}
        <div className="absolute left-0 top-0 inline-flex h-[900px] w-[704px] flex-col items-start justify-start gap-8 rounded-l-[48px] bg-white py-10 pl-12 pr-4">
          {/* Title & Subtitle */}
          <div className="flex flex-col items-start justify-start gap-2 self-stretch">
            <div className="inline-flex items-center justify-start gap-8 self-stretch">
              <div className="text-uFlowText justify-start font-inter-tight text-3xl font-bold">
                {provider.provider_name}
              </div>
            </div>
            <div className="text-uFlowText2 justify-start self-stretch font-inter text-base font-normal">
              {provider.category?.name_de || ''}
            </div>
          </div>
          {/* Enhanced Image Carousel */}
          <div className="flex h-[640px] flex-col items-start justify-start gap-4">
            <div className="relative">
              {/* Main Image Container with Swipe Support */}
              <div
                ref={imageContainerRef}
                className="bg-uFlowAccent relative h-[480px] w-[640px] overflow-hidden rounded-[32px]"
                data-testid="image-container"
                onClick={() => console.log('Image container clicked')}
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
                        alt={`${provider.provider_name} ${index + 1}`}
                        className="rounded-[32px] object-cover"
                        src={imageUrl}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows (only show if multiple images and not at boundaries) */}
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
                      alt={`${provider.provider_name} thumbnail ${i + 1}`}
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
            className="absolute right-12 top-9 flex size-8 items-center justify-center rounded-full hover:bg-zinc-100"
            type="button"
            onClick={onClose}
          >
            <span
              className="bg-uFlowText absolute block h-0.5 w-6 rotate-45"
              style={{ top: 18, left: 7 }}
            />
            <span
              className="bg-uFlowText absolute block h-0.5 w-6 -rotate-45"
              style={{ top: 18, left: 7 }}
            />
          </button>
          <div className="flex h-[640px] flex-col items-start justify-start gap-8 self-stretch">
            {/* Barakah Effekt Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                  {t('providers.ourBarakahEffect')}:
                </div>
                <div className="flex w-full flex-row items-start gap-6">
                  {/* Left: Zakat image, name, subtitle */}
                  <button
                    className="flex w-[160px] flex-shrink-0 flex-col items-start transition-transform active:scale-[0.98]"
                    onClick={() => {
                      onClose();
                      if (communityServices[0]?.community_service_id) {
                        router.push(`/community-services/${communityServices[0].community_service_id}`);
                      }
                    }}
                  >
                    <div className="relative mb-2 h-[120px] w-[160px] overflow-hidden rounded-[18px]">
                      <Image
                        fill
                        alt={communityServices[0]?.community_service_name || 'Community Service'}
                        className="rounded-[18px] object-cover"
                        src={
                          communityServices[0]?.community_service_images && communityServices[0].community_service_images.length > 0
                            ? communityServices[0].community_service_images[0]
                            : PLACEHOLDER_IMAGE
                        }
                      />
                    </div>
                    <div className="text-uFlowText mb-0.5 font-inter-tight text-lg font-semibold">
                      {communityServices[0]?.community_service_name}
                    </div>
                    <div className="text-uFlowText2 font-inter-tight text-base">Hatem Ipsum</div>
                  </button>
                  {/* Divider */}
                  <div className="mx-4 h-[120px] w-px bg-zinc-200" />
                  {/* Right: Barakah labels */}
                  <div className="flex min-h-[120px] flex-col flex-wrap items-start gap-2">
                    {Array.isArray(provider.barakah_effects) && provider.barakah_effects.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {provider.barakah_effects.map((effect, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-2 rounded border border-[#CDCDCD] bg-white px-3 py-1 font-inter-tight text-[16px] font-medium text-[#232323] shadow-sm"
                          >
                            {/* Icon mapping for known effects */}
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
                    ) : (
                      <span className="text-uFlowText2 font-inter text-base">
                        Keine Barakah Effekte
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Adresse Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="inline-flex items-start justify-between self-stretch">
                  <div className="inline-flex flex-1 flex-col items-start justify-start gap-2">
                    <div className="text-uFlowText h-10 w-48 justify-start font-inter-tight text-2xl font-semibold">
                      {provider.address_city ? 'Adresse:' : 'Standort:'}
                    </div>
                    {provider.address_city ? (
                      <button
                        className="justify-start self-stretch font-inter-tight text-base font-normal leading-tight text-neutral-800 hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-neutral-800 disabled:hover:no-underline text-left"
                        disabled={!isAddressNavigable(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined)}
                        title="Adresse antippen zum Navigieren"
                        onClick={() => {
                          const address = formatAddress(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined);
                          if (isAddressNavigable(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined)) {
                            openNavigation(address);
                          }
                        }}
                      >
                        {provider.address_street}, <br />
                        {provider.address_zip} {provider.address_city}
                      </button>
                    ) : (
                      <div className="justify-start self-stretch font-inter-tight text-base font-normal leading-tight text-neutral-800">
                        Online
                      </div>
                    )}
                  </div>
                  <div className="relative w-0 self-stretch">
                    <div className="absolute left-0 top-0 h-0 w-40 origin-top-left rotate-90 outline outline-1 outline-offset-[-0.50px] outline-zinc-100" />
                  </div>
                  <div className="inline-flex flex-1 flex-col items-end justify-start gap-4 overflow-hidden">
                    <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                      Öffnungszeiten:
                    </div>
                    <div className="inline-flex w-40 items-start justify-end gap-2">
                      <div className="w-14 justify-start font-inter-tight text-base font-normal text-neutral-800">
                        Mo - Fr:
                      </div>
                      <div className="w-24 justify-start text-right font-inter-tight text-base font-normal text-neutral-800">
                        Fajr bis Isha
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Actions Bar - moved outside left/right panels for true modal centering */}
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
