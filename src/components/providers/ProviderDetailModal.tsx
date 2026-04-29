import React, { useState, useEffect, useMemo } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Icon } from '@iconify/react';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

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
import {
  getCommunityServicesForProvider,
  type CommunityService,
} from '@/services/communityServices';
import {
  openNavigation,
  formatAddress,
  isAddressNavigable,
  normalizeWebsiteUrl,
  normalizeInstagramUrl,
} from '@/utils/navigationUtils';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { trackEvent } from '@/lib/analytics/plausible';
import { BadgeLabel } from '@/components/ui/BadgeLabel';
import { OpenStatusLine } from '@/features/providers/components/OpenStatusLine';
import { ProviderDetailSections } from '@/features/providers/components/ProviderDetailSections';
import { HalalTrustBanner } from '@/features/providers/components/HalalTrustBanner';
import { HalalTrustPopup } from '@/features/providers/components/HalalTrustPopup';

interface ProviderDetailModalProps {
  provider: Provider;
  onClose: () => void;
  onBookmarkChange?: (providerId: string, isBookmarked: boolean) => void;
  initialCommunityServices?: CommunityService[];
  customActionButtons?: React.ReactNode;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  onClose,
  onBookmarkChange,
  initialCommunityServices,
  customActionButtons,
}) => {
  const HALAL_POPUP_VIEW_COUNT_KEY = 'uf_halal_popup_view_count';
  const HALAL_POPUP_MAX_VIEWS = 10;

  const router = useRouter();
  const isMobile = useIsMobile();
  const { t, language } = useLanguage();

  // Determine entity type for bookmarking (Plan 082: M3 — Critic F1 fix)
  // community_service_id being set means this provider shape wraps a community service
  const isCommunityServiceEntity = !!provider.community_service_id;
  const bookmarkableEntityId = isCommunityServiceEntity
    ? (provider.community_service_id as string)
    : provider.provider_id;
  const bookmarkableEntityType = isCommunityServiceEntity ? 'community_service' : 'provider';

  // Use optimistic bookmarking
  const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
    bookmarkableId: bookmarkableEntityId,
    bookmarkableType: bookmarkableEntityType,
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

  // Memoize image URL processing to avoid recomputation on every render
  const allImageUrls = useMemo(() => {
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
  }, [provider.provider_images]);

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

  const [expandedAction, setExpandedAction] = useState<'save' | 'share' | 'call' | 'website' | 'instagram'>(
    'save',
  );

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [showHalalPopup, setShowHalalPopup] = useState(false);

  // Track image loading states for skeleton display
  const [mainImagesLoaded, setMainImagesLoaded] = useState<Record<number, boolean>>({});
  const [communityImageLoaded, setCommunityImageLoaded] = useState(false);
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState<Record<number, boolean>>({});

  // Use React Query for both bookmark status and community services (parallel fetching)
  // This uses the same cache as the bookmarks list, so it's instant if already loaded
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('provider_id, community_service_id')
        .eq('user_id', user.id);
      return bookmarks?.flatMap((b) => [b.provider_id, b.community_service_id].filter((id): id is string => !!id)) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Show cached data immediately
  });

  // Use React Query for community services (cached, non-blocking, parallel with bookmarks)
  // Use prefetched data from server to avoid client-side waterfall
  const { data: communityServices = [], isLoading: isLoadingCommunityServices } = useQuery({
    queryKey: ['community-services', 'provider', provider.provider_id],
    queryFn: () => getCommunityServicesForProvider(provider.provider_id),
    enabled: !!provider.provider_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData, // Show cached data immediately
    initialData: initialCommunityServices ?? undefined, // Use SSR data if available
    initialDataUpdatedAt: initialCommunityServices ? Date.now() : undefined, // Mark SSR data as fresh
  });

  // Derive bookmark status from cached data (instant, no network request)
  useEffect(() => {
    if (user && bookmarkedProviderIds.length > 0) {
      setIsSaved(bookmarkedProviderIds.includes(bookmarkableEntityId));
    } else if (!user) {
      setIsSaved(false);
    }
  }, [user, bookmarkedProviderIds, bookmarkableEntityId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const parsedCount = Number.parseInt(
      window.localStorage.getItem(HALAL_POPUP_VIEW_COUNT_KEY) ?? '0',
      10,
    );
    const currentCount = Number.isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;

    if (currentCount < HALAL_POPUP_MAX_VIEWS) {
      window.localStorage.setItem(HALAL_POPUP_VIEW_COUNT_KEY, String(currentCount + 1));
      setShowHalalPopup(true);
      return;
    }

    setShowHalalPopup(false);
  }, []);

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

  const handleCloseHalalPopup = () => {
    setShowHalalPopup(false);
  };

  // Action handlers
  const handleExpand = async (action: 'save' | 'share' | 'call' | 'website' | 'instagram') => {
    setExpandedAction(action);
    if (action === 'save') {
      void handleBookmark();
    }
    if (action === 'share') {
      // Use community-services path when rendering a community service entity (Plan 082: M3)
      const shareUrl = isCommunityServiceEntity
        ? `${window.location.origin}/community-services/${provider.community_service_id}`
        : `${window.location.origin}/providers/${provider.provider_id}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: provider.provider_name,
            text: '',
            url: shareUrl,
          });
        } catch (error) {
          // User cancelled or share failed — AbortError means user cancelled (not an error)
          if ((error as Error).name !== 'AbortError') {
            console.error('Share failed:', error);
          }
        }
      } else {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(t('providerDetail.container.toastLinkCopied'));
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error(t('providerDetail.container.toastCopyLinkError'));
        }
      }
    } else if (action === 'call') {
      if (!provider.contact_phone) {
        toast.error(t('providerDetail.container.toastNoPhone'));
        return;
      }

      trackEvent('contact_intent_triggered', {
        contact_type: 'call',
        city: provider.address_city ?? '',
      });

      const phoneNumber = provider.contact_phone.trim();
      const telUrl = `tel:${phoneNumber}`;

      // Create a temporary anchor element to trigger tel: link
      // This works more reliably than window.open or window.location.href
      const link = document.createElement('a');
      link.href = telUrl;
      link.style.display = 'none';
      document.body.appendChild(link);

      try {
        link.click();
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (error) {
        // Clean up on error
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        console.error('Failed to open tel link:', error);

        // Fallback: Copy phone number to clipboard on desktop
        try {
          await navigator.clipboard.writeText(phoneNumber);
          toast.success(
            t('providerDetail.container.toastPhoneCopied', {
              phone: phoneNumber,
            }),
          );
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
          toast.error(t('providerDetail.container.toastOpenPhoneError'));
        }
      }
    } else if (action === 'website' && provider.social_website) {
      const url = normalizeWebsiteUrl(provider.social_website);
      if (url) {
        trackEvent('contact_intent_triggered', {
          contact_type: 'website',
          city: provider.address_city ?? '',
        });
        window.open(url, '_blank');
      }
    } else if (action === 'instagram' && provider.social_instagram) {
      const url = normalizeInstagramUrl(provider.social_instagram);
      if (url) {
        trackEvent('contact_intent_triggered', {
          contact_type: 'instagram',
          city: provider.address_city ?? '',
        });
        window.open(url, '_blank');
      }
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

  // Check if any content is still loading
  const isLoading = isLoadingCommunityServices || !mainImagesLoaded[selectedImageIdx];

  return (
    <>
    <Modal
      isOpen={true}
      title={communityServices[0]?.community_service_name || provider.provider_name}
      onClose={onClose}
    >
      <section
        aria-busy={isLoading}
        aria-label={t('providerDetail.container.ariaProviderDetails')}
        aria-modal="true"
        className="relative flex h-[900px] w-[1200px] cursor-default bg-transparent"
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen reader announcement for loaded content */}
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {!isLoading && t('providerDetail.container.ariaProviderDetailsLoaded')}
        </div>
        {/* Left Section */}
        <div className="absolute left-0 top-0 inline-flex h-[900px] w-[704px] flex-col items-start justify-start gap-8 rounded-l-[48px] bg-white py-10 pl-12 pr-4">
          {/* Title & Subtitle */}
          <div className="flex flex-col items-start justify-start gap-2 self-stretch">
            <div className="inline-flex items-center justify-start gap-8 self-stretch">
              <div className="justify-start font-inter-tight text-3xl font-bold text-uFlowText">
                {provider.provider_name}
              </div>
            </div>
            <OpenStatusLine provider={provider} />
            {formatAddress(
              provider.address_street ?? undefined,
              provider.address_zip ?? undefined,
              provider.address_city ?? undefined,
            ) ? (
              <button
                className="justify-start self-stretch text-left font-inter text-base font-normal text-uFlowText2 hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-uFlowText2 disabled:hover:no-underline"
                disabled={
                  !isAddressNavigable(
                    provider.address_street ?? undefined,
                    provider.address_zip ?? undefined,
                    provider.address_city ?? undefined,
                  )
                }
                title={t('providerDetail.container.addressTapToNavigate')}
                onClick={() => {
                  const address = formatAddress(
                    provider.address_street ?? undefined,
                    provider.address_zip ?? undefined,
                    provider.address_city ?? undefined,
                  );
                  if (
                    isAddressNavigable(
                      provider.address_street ?? undefined,
                      provider.address_zip ?? undefined,
                      provider.address_city ?? undefined,
                    )
                  ) {
                    openNavigation(address);
                  }
                }}
              >
                {formatAddress(
                  provider.address_street ?? undefined,
                  provider.address_zip ?? undefined,
                  provider.address_city ?? undefined,
                )}
              </button>
            ) : (
              <div className="justify-start self-stretch font-inter text-base font-normal text-uFlowText2">
                {provider.category?.name_de || ''}
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
                <div className="flex h-full w-full" style={getTransformStyle()}>
                  {allImageUrls.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative h-full w-full flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      {/* Skeleton loader */}
                      {!mainImagesLoaded[index] && (
                        <Skeleton className="absolute inset-0 rounded-[32px]" />
                      )}
                      <Image
                        fill
                        alt={`${provider.provider_name} ${index + 1}`}
                        className={`rounded-[32px] object-cover transition-opacity duration-300 ${
                          mainImagesLoaded[index] ? 'opacity-100' : 'opacity-0'
                        }`}
                        priority={index === 0}
                        sizes="640px"
                        src={imageUrl}
                        onLoad={() => {
                          setMainImagesLoaded((prev) => ({ ...prev, [index]: true }));
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows (only show if multiple images and not at boundaries) */}
                {allImageUrls.length > 1 && (
                  <>
                    {selectedImageIdx > 0 && (
                      <button
                        aria-label={t('providerDetail.container.previousImage')}
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
                        aria-label={t('providerDetail.container.nextImage')}
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
                    aria-label={t('providerDetail.container.selectImage', { index: i + 1 })}
                    className={`relative overflow-hidden rounded-[8px] border-2 transition-all hover:scale-105 ${
                      selectedImageIdx === i ? 'scale-105 border-primary' : 'border-transparent'
                    }`}
                    style={{ width: 80, height: 60 }}
                    type="button"
                    onClick={() => goToImage(i)}
                  >
                    {/* Skeleton for thumbnails */}
                    {!thumbnailsLoaded[i] && (
                      <Skeleton className="absolute inset-0 rounded-[8px]" />
                    )}
                    <Image
                      fill
                      alt={`${provider.provider_name} thumbnail ${i + 1}`}
                      className={`rounded-[8px] object-cover transition-opacity duration-200 ${
                        thumbnailsLoaded[i] ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="lazy"
                      src={img}
                      onLoad={() => {
                        setThumbnailsLoaded((prev) => ({ ...prev, [i]: true }));
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Right Section */}
        <div className="absolute left-[704px] top-0 inline-flex h-[900px] w-[496px] flex-col items-start justify-start gap-4 overflow-y-auto rounded-r-[48px] bg-white py-36 pl-4 pr-12">
          {/* Close Button */}
          <button
            aria-label={t('providerDetail.popup.closeAria')}
            className="absolute right-12 top-9 flex size-10 items-center justify-center rounded-full text-content transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="size-5" />
          </button>
          {/* Admin action buttons (e.g., edit) — positioned in the right panel header zone */}
          {customActionButtons && (
            <div className="absolute right-12 top-20">
              {customActionButtons}
            </div>
          )}
          <div className="flex flex-col items-start justify-start gap-8 self-stretch">
            {/* Barakah Effekt Section - with fade-in animation */}
            {communityServices.length > 0 && (
            <div
              className="animate-fadeIn flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100"
              style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
            >
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="justify-start font-inter-tight text-2xl font-semibold text-uFlowText">
                  {t('providers.ourBarakahEffect')}:
                </div>
                <div className="flex w-full flex-row items-start gap-6">
                  {/* Left: Zakat image, name, subtitle */}
                  <button
                    className="flex w-[160px] flex-shrink-0 flex-col items-start transition-transform active:scale-[0.98]"
                    onClick={() => {
                      onClose();
                      if (communityServices[0]?.community_service_id) {
                        router.push(
                          `/community-services/${communityServices[0].community_service_id}`,
                        );
                      }
                    }}
                  >
                    <div className="relative mb-2 h-[120px] w-[160px] overflow-hidden rounded-[18px]">
                      {/* Skeleton for community service image */}
                      {!communityImageLoaded && (
                        <Skeleton className="absolute inset-0 rounded-[18px]" />
                      )}
                      <Image
                        fill
                        alt={
                          communityServices[0]?.community_service_name ||
                          t('providerDetail.container.communityServiceAlt')
                        }
                        className={`rounded-[18px] object-cover transition-opacity duration-300 ${
                          communityImageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        src={
                          communityServices[0]?.community_service_images &&
                          communityServices[0].community_service_images.length > 0
                            ? communityServices[0].community_service_images[0]
                            : PLACEHOLDER_IMAGE
                        }
                        onLoad={() => setCommunityImageLoaded(true)}
                      />
                    </div>
                    <div className="mb-0.5 font-inter-tight text-lg font-semibold text-uFlowText">
                      {communityServices[0]?.community_service_name}
                    </div>
                  </button>
                  {/* Divider */}
                  <div className="mx-4 h-[120px] w-px bg-zinc-200" />
                  {/* Right: Badge visuals */}
                  <div className="flex min-h-[120px] flex-col flex-wrap items-start gap-2">
                    {Array.isArray(provider.badges) && provider.badges.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {provider.badges.map((badge) => (
                          <BadgeLabel
                            key={badge.id}
                            badge={badge}
                            language={language === 'de' ? 'de' : 'en'}
                            size="md"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="font-inter text-base text-uFlowText2">
                        {t('providers.noBadges')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
            {/* Offers & Needs Section - with fade-in animation */}
            {((provider.offers && provider.offers.length > 0) ||
              (provider.needs && provider.needs.length > 0)) && (
              <div
                className="animate-fadeIn flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100"
                style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
              >
                <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                  {/* Offers Section */}
                  {provider.offers && provider.offers.length > 0 && (
                    <div className="flex w-full flex-col gap-2.5">
                      <button
                        className="flex w-full items-center justify-between"
                        onClick={() => setExpandedOffers(!expandedOffers)}
                      >
                        <div className="justify-start font-inter-tight text-2xl font-semibold text-uFlowText">
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
                            {provider.offers.map((offer, index) => (
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
                  {provider.offers &&
                    provider.offers.length > 0 &&
                    provider.needs &&
                    provider.needs.length > 0 && <hr className="w-full border-gray-200" />}

                  {/* Needs Section */}
                  {provider.needs && provider.needs.length > 0 && (
                    <div className="flex w-full flex-col gap-2.5">
                      <button
                        className="flex w-full items-center justify-between"
                        onClick={() => setExpandedNeeds(!expandedNeeds)}
                      >
                        <div className="justify-start font-inter-tight text-2xl font-semibold text-uFlowText">
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
                            {provider.needs.map((need, index) => (
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

            <ProviderDetailSections
              badges={provider.badges ?? []}
              isLoadingBadges={false}
              provider={provider}
            />

            <HalalTrustBanner />
          </div>
        </div>
        {/* Actions Bar - moved outside left/right panels for true modal centering */}
        <div className="absolute bottom-10 left-1/2 flex h-[56px] w-auto -translate-x-1/2 items-center gap-0 rounded-[16.8px] border border-[#EEEEEE] bg-white px-2">
          {/* Save Button */}
          <button
            aria-expanded={expandedAction === 'save'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'save' ? 'w-auto gap-1 bg-primary px-3 hover:bg-primary-dark active:bg-primary-darker' : 'w-11 bg-transparent px-3'}`}
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
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'share' ? 'w-auto gap-1 bg-primary px-3 hover:bg-primary-dark active:bg-primary-darker' : 'w-11 bg-transparent px-3'}`}
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
              <span className="font-inter-tight text-base font-medium text-white">
                {t('providerDetail.container.share')}
              </span>
            )}
          </button>
          {/* Phone Button */}
          <button
            aria-expanded={expandedAction === 'call'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'call' ? 'w-auto gap-1 bg-primary px-3 hover:bg-primary-dark active:bg-primary-darker' : 'w-11 bg-transparent px-3'}`}
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
              <span className="font-inter-tight text-base font-medium text-white">
                {t('providerDetail.container.call')}
              </span>
            )}
          </button>
          {/* Website Button */}
          <button
            aria-expanded={expandedAction === 'website'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'website' ? 'w-auto gap-1 bg-primary px-3 hover:bg-primary-dark active:bg-primary-darker' : 'w-11 bg-transparent px-3'}`}
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
              <span className="font-inter-tight text-base font-medium text-white">
                {t('providerDetail.container.website')}
              </span>
            )}
          </button>
          {/* Instagram Button — conditionally rendered */}
          {provider.social_instagram && (
          <button
            aria-expanded={expandedAction === 'instagram'}
            aria-label={t('providerDetail.container.instagram')}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'instagram' ? 'w-auto gap-1 bg-primary px-3 hover:bg-primary-dark active:bg-primary-darker' : 'w-11 bg-transparent px-3'}`}
            type="button"
            onClick={() => handleExpand('instagram')}
          >
            <Icon
              className={
                expandedAction === 'instagram'
                  ? 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-white'
                  : 'size-5 min-h-[20px] min-w-[20px] shrink-0 text-[#272727]'
              }
              height={20}
              icon="mdi:instagram"
              width={20}
            />
            {expandedAction === 'instagram' && (
              <span className="font-inter-tight text-base font-medium text-white">
                {t('providerDetail.container.instagram')}
              </span>
            )}
          </button>
          )}
        </div>
      </section>
    </Modal>
    <HalalTrustPopup isOpen={showHalalPopup} onClose={handleCloseHalalPopup} />
    </>
  );
};
