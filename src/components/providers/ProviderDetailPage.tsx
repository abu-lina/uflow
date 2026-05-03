'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import {
  getAllTrustedImageUrls,
  getAllTrustedImageUrlsWithFallback,
  PLACEHOLDER_IMAGE,
  getCategoryCardBackgroundColor,
  hashId,
  parseCategoryImages,
  type CategoryImages,
} from '@/utils/imageUtils';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import { useCommunityServicesForProvider } from '@/hooks/useCommunityServices';
import {
  openNavigation,
  formatAddress,
  isAddressNavigable,
  normalizeInstagramUrl,
  normalizeWebsiteUrl,
} from '@/utils/navigationUtils';
import {
  getProvidersForCommunityService,
  type CommunityService,
} from '@/services/communityServices';
import { TrustBadgesSection } from '@/components/providers/TrustBadgesSection';
import { EndorseBadgeButton } from '@/components/providers/EndorseBadgeButton';
import { getBadgesForEntityWithConfirmationStatus } from '@/services/badges';
import { EntityType } from '@/types/badges';
import type { BadgeWithConfirmationStatus } from '@/types/badges';
import { OpenStatusLine } from '@/features/providers/components/OpenStatusLine';
import { ProviderDetailSections } from '@/features/providers/components/ProviderDetailSections';
import { HalalTrustBanner } from '@/features/providers/components/HalalTrustBanner';
import { HalalTrustPopup } from '@/features/providers/components/HalalTrustPopup';

interface ProviderDetailPageProps {
  provider: Provider;
  customActionButtons?: React.ReactNode;
  backPath?: string;
  initialCommunityServices?: CommunityService[];
}

export const ProviderDetailPage: React.FC<ProviderDetailPageProps> = ({
  provider,
  customActionButtons,
  backPath,
  initialCommunityServices,
}) => {
  const HALAL_POPUP_VIEW_COUNT_KEY = 'uf_halal_popup_view_count';
  const HALAL_POPUP_MAX_VIEWS = 10;

  const router = useRouter();
  const { t, language } = useLanguage();

  // Helper function to get category name based on language
  const getCategoryName = (category: { name_de?: string; name_en?: string } | undefined) => {
    if (!category) return t('providers.donations');
    if (language === 'en') {
      return category.name_en || category.name_de || t('providers.donations');
    } else {
      return category.name_de || category.name_en || t('providers.donations');
    }
  };

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const providerImageUrls = getAllTrustedImageUrls(provider.provider_images);
  const categoryUrls = parseCategoryImages(provider.category?.category_images ?? null);
  const categoryFallbackImageUrl = categoryUrls.length > 0
    ? categoryUrls[hashId(`${provider.category_id ?? ''}-${provider.provider_id}`) % categoryUrls.length]
    : null;
  const allImageUrls =
    providerImageUrls.length > 0
      ? providerImageUrls
      : categoryFallbackImageUrl
        ? [categoryFallbackImageUrl]
        : [PLACEHOLDER_IMAGE];
  const isUsingCategoryFallbackImage = providerImageUrls.length === 0 && !!categoryFallbackImageUrl;
  const categoryFallbackBackground = isUsingCategoryFallbackImage
    ? getCategoryCardBackgroundColor(provider.category_id, provider.provider_id)
    : '#e5e7eb';

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
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getTransformStyle,
  } = useImageSwipe({
    totalImages: allImageUrls.length,
    enableSwipe: true,
    swipeThreshold: 60,
    boundaryResistance: 0.15,
    velocityThreshold: 0.3,
    minSwipeDistance: 30,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showAllahumaBarik, setShowAllahumaBarik] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wasBookmarked, setWasBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [shouldAnimateFill, setShouldAnimateFill] = useState(false);
  const [isTransiting, setIsTransiting] = useState(false);
  const [showHalalPopup, setShowHalalPopup] = useState(false);

  // Refs to store timeout IDs for cleanup
  const timeoutRefs = useRef<{
    fillTimeout?: ReturnType<typeof setTimeout>;
    stateTimeout?: ReturnType<typeof setTimeout>;
  }>({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    const refs = timeoutRefs.current;
    return () => {
      if (refs.fillTimeout) {
        clearTimeout(refs.fillTimeout);
      }
      if (refs.stateTimeout) {
        clearTimeout(refs.stateTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

  const [expandedOffers, setExpandedOffers] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [expandedBarakah, setExpandedBarakah] = useState(true);
  const [expandedProviders, setExpandedProviders] = useState(false);

  // M-5a: community_service_id dropped — ummah providers detected via listing_type
  const isCommunityService = provider.listing_type === 'ummah';
  const bookmarkableId = provider.provider_id;

  // Use optimistic bookmarking
  const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
    bookmarkableId: bookmarkableId || '',
    bookmarkableType: 'provider',
    onBookmarkChange: (isBookmarked) => {
      setIsSaved(isBookmarked);
    },
  });

  // Use React Query for caching community services (only for providers)
  // Use prefetched data from server to avoid client-side waterfall
  const { data: communityServices = [], isLoading: isLoadingCommunityServices } =
    useCommunityServicesForProvider(provider.provider_id, initialCommunityServices);

  // Fetch badges with user confirmation status for endorsement UX
  const entityId = provider.provider_id;
  const entityType = EntityType.PROVIDER;
  const {
    data: badgesWithStatus = [],
    isLoading: isLoadingBadges,
    refetch: refetchBadges,
  } = useQuery<BadgeWithConfirmationStatus[]>({
    queryKey: ['badges', entityId, user?.id],
    queryFn: () =>
      getBadgesForEntityWithConfirmationStatus(entityId || '', entityType, user?.id || null),
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Use React Query for providers supporting this ummah provider (engagement graph)
  const { data: supportingProviders = [] } = useQuery<
    Array<{
      provider_id: string;
      provider_name: string;
      provider_images?: string | null;
      address_city?: string;
      category?: { name_de?: string; name_en?: string; category_images?: unknown };
    }>
  >({
    queryKey: ['providers', 'community-service', provider.provider_id],
    queryFn: () => {
      if (!isCommunityService) return Promise.resolve([]);
      return getProvidersForCommunityService(provider.provider_id);
    },
    enabled: isCommunityService,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for bookmark status (cached, non-blocking)
  // This uses the same cache as the bookmarks list, so it's instant if already loaded
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('provider_id')
        .eq('user_id', user.id);
      return bookmarks?.map((b) => b.provider_id).filter((id): id is string => !!id) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Show cached data immediately
  });

  // Derive bookmark status from cached data (instant, no network request)
  useEffect(() => {
    if (user && bookmarkableId && bookmarkedProviderIds.length > 0) {
      setIsSaved(bookmarkedProviderIds.includes(bookmarkableId));
    } else if (!user) {
      setIsSaved(false);
    }
  }, [user, bookmarkedProviderIds, bookmarkableId]);

  // Community services are now fetched via React Query hook above

  const handleBookmark = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!user) {
      // Redirect to bookmark menu (saved page) when not authenticated
      router.push('/saved');
      return;
    }

    if (isAnimating) return;

    if (!isSaved) {
      setIsAnimating(true);
      setIsTransiting(true);
      setShowAllahumaBarik(true);

      // Start bookmark action immediately (optimistic update happens first)
      const bookmarkStartTime = Date.now();
      const minDisplayTime = 800; // Minimum time to show "Allahuma Barik" (800ms)

      try {
        // Perform the bookmark action (optimistic update happens immediately)
        await handleOptimisticBookmark();

        // Calculate remaining time to show "Allahuma Barik"
        const elapsed = Date.now() - bookmarkStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        // Wait for minimum display time OR until request completes (whichever is longer)
        timeoutRefs.current.stateTimeout = setTimeout(() => {
          setShowAllahumaBarik(false);
          // Trigger fill animation when transitioning to saved
          setShouldAnimateFill(true);

          setIsAnimating(false);
          // Reset animation flag after animation completes
          timeoutRefs.current.fillTimeout = setTimeout(() => {
            setShouldAnimateFill(false);
            setIsTransiting(false);
          }, 800);
        }, remainingTime);
      } catch (error) {
        console.error('Error toggling bookmark:', error);
        setShowAllahumaBarik(false);
        setIsAnimating(false);
        setIsTransiting(false);
      }
    } else {
      // Track that we were bookmarked before toggling
      setWasBookmarked(true);
      // If already bookmarked, hide Allahuma Barik and toggle off
      setShowAllahumaBarik(false);
      setIsAnimating(true);
      try {
        await handleOptimisticBookmark();
        // Small delay to ensure state updates propagate
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error('Error toggling bookmark:', error);
      } finally {
        setIsAnimating(false);
        setWasBookmarked(false);
      }
    }
  };

  // Action handlers
  const handleBookmarkAction = (e?: React.MouseEvent) => {
    void handleBookmark(e);
  };

  // Determine button state
  const getButtonState = (): 'idle' | 'loading' | 'saved' | 'barik' => {
    // Prioritize barik state - if showing barik, show it (even if animating)
    if (showAllahumaBarik) return 'barik';
    // Loading state only if actively animating AND not saved yet
    if (isAnimating && !isSaved) return 'loading';
    if (isSaved) return 'saved';
    return 'idle';
  };

  const handleShareAction = () => {
    // M-5a: ummah providers use /providers/[id] route
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
  };

  const handleCloseHalalPopup = () => {
    setShowHalalPopup(false);
  };

  // Mobile version
  if (isMobile) {
    return (
      <>
        <div className="bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
          {/* Mobile Content */}
          <div className="pb-24">
            <MobileProviderDetail provider={provider} onBack={handleBack} />

          {/* Provider Info Card */}
          <div className="mx-6 mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-inter-tight text-xl font-semibold text-content-heading">
              {provider.provider_name}
            </h2>
            <OpenStatusLine provider={provider} />
            {provider.address_city ? (
              <button
                className="mt-1 text-left text-gray-600 hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-gray-600 disabled:hover:no-underline"
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
                {provider.address_street && provider.address_zip
                  ? `${provider.address_street}, ${provider.address_zip} ${provider.address_city}`
                  : provider.address_city}
              </button>
            ) : (
              <div className="mt-1 text-gray-600">{t('providerDetail.container.online')}</div>
            )}

            {/* Contact Icons */}
            <div className="mt-4 flex items-center gap-4">
              {provider.social_website && (
                <button
                  className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
                  onClick={() => {
                    const url = normalizeWebsiteUrl(provider.social_website);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <Icon className="h-5 w-5 text-gray-600" icon="mdi:internet" />
                </button>
              )}
              {provider.contact_phone && (
                <button
                  className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
                  onClick={() => window.open(`tel:${provider.contact_phone}`)}
                >
                  <Icon className="h-5 w-5 text-gray-600" icon="entypo:old-phone" />
                </button>
              )}
              {provider.social_instagram && (
                <button
                  className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
                  onClick={() => {
                    const url = normalizeInstagramUrl(provider.social_instagram);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <Icon className="h-5 w-5 text-gray-600" icon="mdi:instagram" />
                </button>
              )}
            </div>
          </div>

          {/* Trust & Verification Badges Section */}
          <div className="mx-6 mt-4">
            <TrustBadgesSection
              badges={badgesWithStatus}
              isLoading={isLoadingBadges}
              renderEndorsement={(badge) => (
                <EndorseBadgeButton
                  badge={badge as BadgeWithConfirmationStatus}
                  userId={user?.id || null}
                  onEndorsementChange={() => void refetchBadges()}
                  onLoginRequired={() => router.push('/auth/login')}
                />
              )}
            />
          </div>

          {/* Barakah Effect Section */}
          {isLoadingCommunityServices ? (
            <div className="mx-6 mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="animate-pulse">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-5 w-40 rounded bg-gray-200"></div>
                  <div className="h-5 w-5 rounded bg-gray-200"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-28 rounded bg-gray-200"></div>
                      <div className="h-3 w-20 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            communityServices &&
            communityServices.length > 0 && (
              <div className="mx-6 mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setExpandedBarakah(!expandedBarakah)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-inter-tight text-lg font-semibold text-content-heading">
                      {t('providers.ourBarakahEffect')}
                    </h3>
                    <Icon className="h-4 w-4 text-gray-500" icon="material-symbols:info-outline" />
                  </div>
                  <ChevronDown
                    className={`h-6 w-6 text-gray-600 transition-transform ${
                      expandedBarakah ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedBarakah && (
                  <div className="mt-4 space-y-3">
                    {communityServices.map((service, index) => (
                      <button
                        key={index}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                        onClick={() =>
                          router.push(`/providers/${service.community_service_id}`)
                        }
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                          <Image
                            fill
                            alt={service.community_service_name}
                            className="object-cover"
                            src={
                              service.community_service_images &&
                              service.community_service_images.length > 0
                                ? service.community_service_images[0]
                                : PLACEHOLDER_IMAGE
                            }
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-inter-tight font-medium text-content">
                            {service.community_service_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getCategoryName(service.category)}
                          </p>
                          <p className="text-sm text-gray-600">
                            +{service.donation_count || 10}{' '}
                            {service.category?.name_de === 'Moschee'
                              ? t('providers.initiativesSupported')
                              : t('providers.donations')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Combined Offers & Needs Section */}
          {((provider.offers && provider.offers.length > 0) ||
            (provider.needs && provider.needs.length > 0)) && (
            <div className="mx-6 mt-4 rounded-2xl bg-white shadow-sm">
              {/* Offers Section */}
              {provider.offers && provider.offers.length > 0 && (
                <div className="p-4">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedOffers(!expandedOffers)}
                  >
                    <h3 className="font-inter-tight text-lg font-semibold text-content-heading">
                      {t('providers.weOffer')}
                    </h3>
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
                provider.needs.length > 0 && <hr className="mx-4 border-gray-200" />}

              {/* Needs Section */}
              {provider.needs && provider.needs.length > 0 && (
                <div className="p-4">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedNeeds(!expandedNeeds)}
                  >
                    <h3 className="font-inter-tight text-lg font-semibold text-content-heading">
                      {t('providers.weAreLookingFor')}
                    </h3>
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
          )}

          <div className="mx-6 mt-4 space-y-4">
            <ProviderDetailSections
              badges={badgesWithStatus}
              isLoadingBadges={isLoadingBadges}
              provider={provider}
            />
            <HalalTrustBanner />
          </div>
        </div>
        </div>

        {/* Mobile Action Buttons - Fixed at bottom */}
        {customActionButtons ? (
          // Custom action buttons (like FooterAction) handle their own styling
          customActionButtons
        ) : (
          <div className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/30 bg-white px-6 pt-4">
            <div className="flex w-full gap-3.5">
              {/* Save Button */}
              <BookmarkButton
                isHovered={isHovered}
                isTransiting={isTransiting}
                savedText={t('actions.saved')}
                saveText={t('actions.save')}
                shouldAnimateFill={shouldAnimateFill}
                state={getButtonState()}
                wasBookmarked={wasBookmarked}
                onClick={handleBookmarkAction}
                onHoverEnd={() => setIsHovered(false)}
                onHoverStart={() => setIsHovered(true)}
              />

              {/* Share Button */}
              <button
                aria-label={t('providerDetail.container.shareProviderAria')}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
                onClick={handleShareAction}
              >
                <Icon className="h-5 w-5 text-gray-700" icon="lucide:share-2" />
              </button>
            </div>
          </div>
        )}
        <HalalTrustPopup isOpen={showHalalPopup} onClose={handleCloseHalalPopup} />
      </>
    );
  }

  // Desktop version - similar to existing modal but as a page
  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-content-muted hover:text-content-heading"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-inter-tight">{t('providerDetail.container.back')}</span>
            </button>
            <h1 className="font-inter-tight text-2xl font-bold text-content-heading">
              {provider.provider_name}
            </h1>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Desktop Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative h-[480px] w-full cursor-grab overflow-hidden rounded-3xl active:cursor-grabbing"
              style={{
                backgroundColor: categoryFallbackBackground,
                userSelect: 'none',
              }}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchStart}
            >
              <div
                ref={imageContainerRef}
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
                      className="object-cover"
                      priority={index === 0}
                      sizes="(min-width: 1024px) 50vw, 100vw"
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
                      className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  {selectedImageIdx < allImageUrls.length - 1 && (
                    <button
                      className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImageUrls.length > 1 && (
              <div className="flex gap-4">
                {allImageUrls.map((img, i) => (
                  <button
                    key={i}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedImageIdx === i ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ width: 80, height: 60 }}
                    onClick={() => goToImage(i)}
                  >
                    <Image
                      fill
                      alt={t('providers.providerThumbnailAlt', { name: provider.provider_name, index: i + 1 })}
                      className="object-cover"
                      src={img}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Provider Info */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="font-inter-tight text-3xl font-bold text-content-heading">
                {provider.provider_name}
              </h2>
              <OpenStatusLine provider={provider} />
              <p className="mt-2 text-gray-600">{getCategoryName(provider.category)}</p>

              {/* Contact Actions */}
              <div className="mt-6 flex items-center gap-4">
                {provider.social_website && (
                  <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() =>
                      provider.social_website && window.open(provider.social_website, '_blank')
                    }
                  >
                    <Icon className="h-4 w-4" icon="mdi:internet" />
                    {t('providerDetail.container.website')}
                  </button>
                )}
                {provider.contact_phone && (
                  <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(`tel:${provider.contact_phone}`)}
                  >
                    <Icon className="h-4 w-4" icon="entypo:old-phone" />
                    {t('providerDetail.container.call')}
                  </button>
                )}
              </div>
            </div>

            {/* Trust & Verification Badges Section */}
            <TrustBadgesSection
              badges={badgesWithStatus}
              isLoading={isLoadingBadges}
              renderEndorsement={(badge) => (
                <EndorseBadgeButton
                  badge={badge as BadgeWithConfirmationStatus}
                  userId={user?.id || null}
                  onEndorsementChange={() => void refetchBadges()}
                  onLoginRequired={() => router.push('/auth/login')}
                />
              )}
            />

            {/* Barakah Effect - Show loading state or content */}
            {isLoadingCommunityServices ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-6 w-48 rounded bg-gray-200"></div>
                    <div className="h-6 w-6 rounded bg-gray-200"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="mb-2 h-4 w-32 rounded bg-gray-200"></div>
                        <div className="h-3 w-24 rounded bg-gray-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              communityServices &&
              communityServices.length > 0 && (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedBarakah(!expandedBarakah)}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-inter-tight text-2xl font-semibold text-content-heading">
                        {t('providers.ourBarakahEffect')}
                      </h3>
                      <Icon
                        className="h-5 w-5 text-gray-500"
                        icon="material-symbols:info-outline"
                      />
                    </div>
                    <ChevronDown
                      className={`h-7 w-7 text-gray-600 transition-transform ${
                        expandedBarakah ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedBarakah && (
                    <div className="mt-4 space-y-3">
                      {communityServices.map((service, index) => {
                        const firstImageUrl =
                          service.community_service_images &&
                          service.community_service_images.length > 0
                            ? service.community_service_images[0]
                            : PLACEHOLDER_IMAGE;

                        const handleMouseEnter = () => {
                          // Prefetch the route
                          router.prefetch(`/community-services/${service.community_service_id}`);
                          // Prefetch the first image
                          if (firstImageUrl && firstImageUrl !== PLACEHOLDER_IMAGE) {
                            const link = document.createElement('link');
                            link.rel = 'prefetch';
                            link.as = 'image';
                            link.href = firstImageUrl;
                            document.head.appendChild(link);
                          }
                        };

                        return (
                          <button
                            key={index}
                            className="flex w-full items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                            onClick={() =>
                              router.push(`/community-services/${service.community_service_id}`)
                            }
                            onMouseEnter={handleMouseEnter}
                          >
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                              <Image
                                fill
                                alt={service.community_service_name}
                                className="object-cover"
                                src={
                                  service.community_service_images &&
                                  service.community_service_images.length > 0
                                    ? service.community_service_images[0]
                                    : PLACEHOLDER_IMAGE
                                }
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-inter-tight font-semibold text-content">
                                {service.community_service_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {getCategoryName(service.category)}
                              </p>
                              <p className="text-sm text-gray-600">
                                +{service.donation_count || 10}{' '}
                                {service.category?.name_de === 'Moschee'
                                  ? t('providers.initiativesSupported')
                                  : t('providers.donations')}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Supporting Providers Section (only for community services) */}
            {isCommunityService && supportingProviders.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setExpandedProviders(!expandedProviders)}
                >
                  <h3 className="font-inter-tight text-2xl font-semibold text-content-heading">
                    {t('providerDetail.container.supporters')}
                  </h3>
                  <ChevronDown
                    className={`h-7 w-7 text-gray-600 transition-transform ${
                      expandedProviders ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedProviders && (
                  <div className="mt-4">
                    {supportingProviders.map((supportingProvider) => {
                      const providerImageUrls = getAllTrustedImageUrlsWithFallback(
                        supportingProvider.provider_images,
                        supportingProvider.category?.category_images as CategoryImages,
                      );
                      const providerImage =
                        providerImageUrls.length > 0 ? providerImageUrls[0] : PLACEHOLDER_IMAGE;

                      return (
                        <button
                          key={supportingProvider.provider_id}
                          className="flex w-full items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                          onClick={() =>
                            router.push(`/providers/${supportingProvider.provider_id}`)
                          }
                        >
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                            <Image
                              fill
                              alt={supportingProvider.provider_name}
                              className="object-cover"
                              src={providerImage}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-inter-tight font-semibold text-content">
                              {supportingProvider.provider_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getCategoryName(supportingProvider.category)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Combined Offers & Needs Section */}
            {((provider.offers && provider.offers.length > 0) ||
              (provider.needs && provider.needs.length > 0)) && (
              <div className="rounded-2xl bg-white shadow-sm">
                {/* Offers Section */}
                {provider.offers && provider.offers.length > 0 && (
                  <div className="p-6">
                    <button
                      className="flex w-full items-center justify-between"
                      onClick={() => setExpandedOffers(!expandedOffers)}
                    >
                      <h3 className="font-inter-tight text-2xl font-semibold text-content-heading">
                        {t('providers.weOffer')}
                      </h3>
                      <ChevronDown
                        className={`h-7 w-7 text-gray-600 transition-transform ${
                          expandedOffers ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedOffers && (
                      <div className="mt-3">
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
                  provider.needs.length > 0 && <hr className="mx-4 border-gray-200" />}

                {/* Needs Section */}
                {provider.needs && provider.needs.length > 0 && (
                  <div className="p-6">
                    <button
                      className="flex w-full items-center justify-between"
                      onClick={() => setExpandedNeeds(!expandedNeeds)}
                    >
                      <h3 className="font-inter-tight text-2xl font-semibold text-content-heading">
                        {t('providers.weAreLookingFor')}
                      </h3>
                      <ChevronDown
                        className={`h-7 w-7 text-gray-600 transition-transform ${
                          expandedNeeds ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedNeeds && (
                      <div className="mt-3">
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
            )}

            <ProviderDetailSections
              badges={badgesWithStatus}
              isLoadingBadges={isLoadingBadges}
              provider={provider}
            />

            <HalalTrustBanner />

            {/* Action Buttons */}
            {customActionButtons ? (
              <div className="flex gap-4">{customActionButtons}</div>
            ) : (
              <div className="flex gap-4">
                <div className="flex-1">
                  <BookmarkButton
                    className="h-auto"
                    isHovered={isHovered}
                    isTransiting={isTransiting}
                    savedText={t('actions.saved')}
                    saveText={t('actions.save')}
                    shouldAnimateFill={shouldAnimateFill}
                    state={getButtonState()}
                    wasBookmarked={wasBookmarked}
                    onClick={handleBookmarkAction}
                    onHoverEnd={() => setIsHovered(false)}
                    onHoverStart={() => setIsHovered(true)}
                  />
                </div>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-inter-tight font-medium text-gray-700 hover:bg-gray-50"
                  onClick={handleShareAction}
                >
                  <Icon className="h-5 w-5" icon="material-symbols:share" />
                  {t('providerDetail.container.share')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <HalalTrustPopup isOpen={showHalalPopup} onClose={handleCloseHalalPopup} />
    </>
  );
};
