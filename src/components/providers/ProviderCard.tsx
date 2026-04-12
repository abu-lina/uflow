import React, { forwardRef, useState, useEffect, useRef } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

import { Icon } from '@iconify/react';

import { AnimatedHeartIcon } from '@/components/ui/AnimatedHeartIcon';
import { BarikButton } from '@/components/ui/BarikButton';
import { Button } from '@/components/ui/Button';
import { BadgeLabel } from '@/components/ui/BadgeLabel';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useOptimisticBookmark } from '@/hooks/useOptimisticBookmark';
import type { Provider, ReviewStatusFilter } from '@/services/providers';
import { safeJsonParse } from '@/utils/json';
import { openNavigation, isAddressNavigable } from '@/utils/navigationUtils';
import { computeHalalStars, computeBarakahBadge } from '@/utils/sectionBadges';

interface ProviderCardProps extends Omit<Provider, 'id' | 'category_id'> {
  className?: string;
  gradient?: boolean;
  hideActions?: boolean;
  hideWebsiteButton?: boolean;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  bookmarkableType?: 'provider' | 'community_service';
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  /** Card mode: 'bookmark' (default) shows Save/Saved, 'moderation' shows Approve/Reject */
  mode?: 'bookmark' | 'moderation';
  /** Review status for moderation mode badge display */
  reviewStatus?: ReviewStatusFilter;
  /** Callback when admin approves the provider */
  onApprove?: () => void;
  /** Callback when admin rejects the provider */
  onReject?: () => void;
  /** Loading state for review actions */
  isReviewing?: boolean;
}

export const ProviderCard = React.memo(
  forwardRef<HTMLDivElement, ProviderCardProps>(
  (
    {
      address_street,
      address_zip,
      address_city,
      category,
      gradient = false,
      provider_images,
      barakah_effects = [],
      badges = [],
      provider_name,
      provider_id,
      className,
      hideActions = false,
      hideWebsiteButton = false,
      isBookmarked = false,
      onBookmarkChange,
      bookmarkableType = 'provider',
      priority = false,
      loading,
      // Plan 058: Moderation mode props
      mode = 'bookmark',
      reviewStatus,
      onApprove,
      onReject,
      isReviewing = false,
      // Plan 089: Section classification fields for computed badges
      listing_type,
      halal_level,
      muslim_owned,
      accepts_donations,
      solidarity_pricing,
      has_prayer_space,
      family_friendly,
      women_friendly,
    },
    ref,
  ) => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    // Initialize bookmarked state from prop to prevent flash on mount
    const [bookmarked, setBookmarked] = useState(() => isBookmarked);
    const [showAllahumaBarik, setShowAllahumaBarik] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [wasBookmarked, setWasBookmarked] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [shouldAnimateFill, setShouldAnimateFill] = useState(false);
    const [isTransiting, setIsTransiting] = useState(false);
    
    // Refs to store timeout IDs for cleanup
    const timeoutRefs = useRef<{
      barikTimeout?: ReturnType<typeof setTimeout>;
      fillTimeout?: ReturnType<typeof setTimeout>;
      stateTimeout?: ReturnType<typeof setTimeout>;
    }>({});
    
    // Cleanup timeouts on unmount
    useEffect(() => {
      const refs = timeoutRefs.current;
      return () => {
        if (refs.barikTimeout) {
          clearTimeout(refs.barikTimeout);
        }
        if (refs.fillTimeout) {
          clearTimeout(refs.fillTimeout);
        }
        if (refs.stateTimeout) {
          clearTimeout(refs.stateTimeout);
        }
      };
    }, []);
    
    // Use optimistic bookmarking
    const { handleBookmark: handleOptimisticBookmark } = useOptimisticBookmark({
      bookmarkableId: provider_id,
      bookmarkableType,
      onBookmarkChange: (isBookmarked) => {
        setBookmarked(isBookmarked);
        onBookmarkChange?.(isBookmarked);
      },
    });
    // Sync bookmarked state with prop, avoiding updates during active transitions
    useEffect(() => {
      // Only sync when not in a transition to prevent state conflicts
      if (!isTransiting && !isAnimating && !showAllahumaBarik && !isLoading) {
      setBookmarked(isBookmarked);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isBookmarked]);
    
    // Use prop directly for rendering when not transitioning to avoid flash
    // During active transitions (barik/showing), use internal state; otherwise use prop directly
    // When fill animation is active (shouldAnimateFill), use bookmarked state to ensure animation shows
    const displayBookmarked = showAllahumaBarik || isLoading || shouldAnimateFill ? bookmarked : isBookmarked;
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
    // Categories are stored in DE/EN only, so we use English for non-German languages when available
    const getCategoryName = () => {
      if (!category) return t('search.unnamed');
      
      // For English, prefer English name
      if (language === 'en') {
        return category.name_en || category.name_de || t('search.unnamed');
      }
      
      // For German, prefer German name
      if (language === 'de') {
        return category.name_de || category.name_en || t('search.unnamed');
      }
      
      // For all other languages (ar, tr, ur, ps), prefer English over German
      // This provides better internationalization than showing German text
      return category.name_en || category.name_de || t('search.unnamed');
    };
    const categoryName = getCategoryName();

    const handleBookmark = async (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!user) {
        // Redirect to bookmark menu (saved page) when not authenticated
        router.push('/saved');
        return;
      }
      
      if (isAnimating) return;
      
      if (!bookmarked) {
        setIsAnimating(true);
        setIsTransiting(true);
        setShowAllahumaBarik(true);
        // After showing Allahuma Barik, smoothly transition to Saved state
        timeoutRefs.current.barikTimeout = setTimeout(async () => {
          // Perform the actual bookmark action first (this will set bookmarked=true via optimistic update)
          try {
            await handleOptimisticBookmark();
            // Small delay to ensure state updates propagate
            timeoutRefs.current.stateTimeout = setTimeout(() => {
              // Now hide barik and trigger fill animation
              setShowAllahumaBarik(false);
              setShouldAnimateFill(true);
              
              setIsAnimating(false);
              // Reset animation flags after animation completes (stroke + fill = ~800ms)
              timeoutRefs.current.fillTimeout = setTimeout(() => {
                setShouldAnimateFill(false);
                setIsTransiting(false);
              }, 800);
            }, 50);
          } catch (error) {
            console.error('Error toggling bookmark:', error);
          setShowAllahumaBarik(false);
            setIsAnimating(false);
            setIsTransiting(false);
          }
        }, 1500);
      } else {
        // Track that we were bookmarked before toggling
        setWasBookmarked(true);
        // If already bookmarked, hide Allahuma Barik and toggle off
        setShowAllahumaBarik(false);
      setIsLoading(true);
      try {
        await handleOptimisticBookmark();
      } catch (error) {
        console.error('Error toggling bookmark:', error);
      } finally {
        setIsLoading(false);
          setWasBookmarked(false);
        }
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

    // Show skeleton while image is loading (but keep image loading in background)
    const showSkeleton = !imageLoaded && !gradient;

    return (
      <div ref={ref} className={`inline-flex shrink-0 flex-col items-start ${className || ''}`}>
        <div className="relative flex h-64 w-72 flex-col items-center justify-between">
          {gradient ? (
            <div
              className="\ absolute left-0 top-0 flex h-64 w-72 flex-col items-center justify-between
              rounded-t-3xl bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500"
            />
          ) : (
            <>
              {showSkeleton && (
                <div className="absolute left-0 top-0 h-64 w-72 animate-pulse rounded-t-3xl bg-neutral-200" />
              )}
              <div className={`border-uFlowWhite absolute left-0 top-0 h-64 w-72 overflow-hidden rounded-t-3xl border ${showSkeleton ? 'opacity-0' : 'opacity-100'}`}>
                <Image
                  fill
                  alt={provider_name}
                  className="object-cover"
                  loading={loading}
                  priority={priority}
                  sizes="(max-width: 768px) 100vw, 288px"
                  src={getImageUrl()}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </>
          )}
          {!showSkeleton && (
            <div className="absolute bottom-3 left-3">
              <div className="inline-flex h-6 items-center justify-center overflow-hidden rounded-[7.2px] border border-border bg-background/70 px-2 backdrop-blur-[1.50px]">
                <div className="justify-center text-center font-inter-tight text-sm font-medium text-content">
                  {categoryName}
                </div>
              </div>
            </div>
          )}
          {/* Plan 058: Review status badge for moderation mode */}
          {!showSkeleton && mode === 'moderation' && reviewStatus && (
            <div className="absolute top-3 right-3">
              <div 
                className={`inline-flex h-6 items-center justify-center overflow-hidden rounded-[7.2px] border px-2 backdrop-blur-[1.50px] ${
                  reviewStatus === 'approved' 
                    ? 'border-green-500 bg-green-100/70 text-green-700' 
                    : reviewStatus === 'rejected' 
                    ? 'border-red-500 bg-red-100/70 text-red-700'
                    : reviewStatus === 'needs_revision'
                    ? 'border-amber-500 bg-amber-100/70 text-amber-700'
                    : 'border-yellow-500 bg-yellow-100/70 text-yellow-700'
                }`}
              >
                <span className="justify-center text-center font-inter-tight text-xs font-medium capitalize">
                  {reviewStatus.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
        {showSkeleton ? (
          <div className="flex w-72 flex-col items-center rounded-b-3xl bg-white p-3.5 outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300">
            <div className="flex w-full flex-col items-start gap-3.5">
              <div className="h-6 w-3/4 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        ) : (
          <div
            className="flex w-72 flex-col items-center rounded-b-3xl bg-white p-3.5
          outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300"
          >
          <div className="flex w-full flex-col items-start gap-3.5">
            <div className="flex w-full min-w-0 flex-col items-start gap-0.5">
              <span
                className="w-full min-w-0 truncate font-inter-tight text-xl font-semibold text-content"
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
            {badges && badges.length > 0 && (
              <div className="flex h-6 w-full items-center gap-1.5 overflow-hidden">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {badges.slice(0, 3).map((badge) => (
                    <BadgeLabel
                      key={badge.id}
                      badge={badge}
                      language={language === 'de' ? 'de' : 'en'}
                      size="sm"
                    />
                  ))}
                  {badges.length > 3 && (
                    <div className="flex h-6 shrink-0 items-center rounded-[3px] border border-[#CDCDCD] bg-background/80 px-1.5 backdrop-blur-sm">
                      <span className="font-inter-tight text-sm font-medium text-content-heading">
                        +{badges.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Plan 089 M5: Computed section badges — halal stars (FOOD) + Barakah (FOOD/BUSINESS) */}
            {(() => {
              const halalStars = listing_type === 'food' ? computeHalalStars({ halal_level }) : 0;
              // Barakah badge applies to FOOD and BUSINESS (not community services — those have no listing_type)
              const showBarakah = computeBarakahBadge({ muslim_owned, accepts_donations, solidarity_pricing, has_prayer_space, family_friendly, women_friendly });
              if (!halalStars && !showBarakah) return null;
              return (
                <div className="flex h-6 w-full items-center gap-1.5 overflow-hidden">
                  {halalStars > 0 && (
                    <div
                      aria-label={`Halal Level ${halalStars}`}
                      className="flex h-6 shrink-0 items-center gap-0.5 rounded-[3px] border border-[#CDCDCD] bg-background/80 px-1.5 backdrop-blur-sm"
                      role="img"
                      title={`Halal Level ${halalStars}`}
                    >
                      {Array.from({ length: halalStars }).map((_, i) => (
                        <Icon key={i} className="text-amber-500" height={12} icon="mdi:star" width={12} />
                      ))}
                    </div>
                  )}
                  {showBarakah && (
                    <div
                      aria-label="Barakah"
                      className="flex h-6 shrink-0 items-center rounded-[3px] border border-emerald-300 bg-emerald-50/80 px-1.5 backdrop-blur-sm"
                      role="img"
                      title="Barakah"
                    >
                      <span className="font-inter-tight text-xs font-medium text-emerald-700">Barakah</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {barakah_effects && barakah_effects.length > 0 && (
              <div className="flex h-7 w-full items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                  {(barakah_effects || []).slice(0, 2).map((effect: string, index: number) => (
                    <div
                      key={index}
                      className="flex shrink-0 items-center rounded-[4.9px] border border-[#CDCDCD] bg-background/80 px-1 py-0.5 backdrop-blur-sm"
                    >
                      <span className="font-inter-tight text-sm font-medium text-content-heading">
                        {effect}
                      </span>
                    </div>
                  ))}
                  {barakah_effects && barakah_effects.length > 2 && (
                    <div className="flex shrink-0 items-center rounded-[4.9px] border border-[#CDCDCD] bg-background/80 px-1 py-0.5 backdrop-blur-sm">
                      <span className="font-inter-tight text-sm font-medium text-content-heading">
                        +{barakah_effects.length - 2}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!hideActions && (
              <div className="flex w-full gap-3.5">
                {/* Plan 058: Moderation Mode - Show Approve/Reject buttons for admin review */}
                {mode === 'moderation' ? (
                  <div className="flex w-full gap-2">
                    <Button
                      aria-label="Approve"
                      className="flex-1 h-12 items-center justify-center gap-1.5"
                      disabled={isReviewing}
                      icon={
                        <div className="flex items-center">
                          <Icon height={16} icon="mdi:check" width={16} />
                        </div>
                      }
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove?.();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      aria-label="Reject"
                      className="flex-1 h-12 items-center justify-center gap-1.5"
                      disabled={isReviewing}
                      icon={
                        <div className="flex items-center">
                          <Icon height={16} icon="mdi:close" width={16} />
                        </div>
                      }
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject?.();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  /* Default bookmark mode */
                  <>
                <div className="relative flex-1 h-12">
                  <motion.div
                    className="size-full cursor-pointer relative"
                    style={{ 
                      pointerEvents: (isLoading || isAnimating) ? 'none' : 'auto',
                      WebkitTapHighlightColor: 'transparent',
                      WebkitTouchCallout: 'none',
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                      willChange: 'transform',
                    }}
                    transition={{ duration: 0.15 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBookmark}
                    onHoverEnd={() => setIsHovered(false)}
                    onHoverStart={() => setIsHovered(true)}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseLeave={() => setIsPressed(false)}
                    onMouseUp={() => setIsPressed(false)}
                    onTouchEnd={() => setIsPressed(false)}
                    onTouchStart={() => setIsPressed(true)}
                  >
                    {/* Pressed state overlay */}
                    <motion.div
                      animate={{ opacity: isPressed ? 0.7 : 0 }}
                      className="absolute inset-0 z-10 pointer-events-none"
                      style={{
                        background: '#49837D',
                        borderRadius: displayBookmarked ? '9.6px' : '12px',
                        WebkitTransform: 'translateZ(0)',
                        transform: 'translateZ(0)',
                        WebkitBackfaceVisibility: 'hidden',
                        backfaceVisibility: 'hidden',
                      }}
                      transition={{ duration: 0.1 }}
                    />
                    {showAllahumaBarik ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="barik"
                          animate={{ scale: 1 }}
                          className="size-full"
                          exit={{ opacity: 0, scale: 1.02 }}
                          initial={{ scale: 0.98 }}
                          style={{ opacity: 1 }}
                          transition={{ 
                            duration: 0.5, 
                            ease: [0.25, 0.1, 0.25, 1]
                          }}
                        >
                          <BarikButton />
                        </motion.div>
                      </AnimatePresence>
                    ) : displayBookmarked ? (
                      <div
                        className="size-full"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitTouchCallout: 'none',
                        }}
                      >
                        <div 
                          className="relative rounded-[9.6px] size-full overflow-hidden"
                          style={{
                            backgroundColor: '#49837D',
                            isolation: 'isolate',
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                            WebkitTransform: 'translateZ(0)',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                            WebkitMaskImage: '-webkit-radial-gradient(white, white)',
                            maskImage: 'radial-gradient(white, white)',
                          }}
                        >
                          <div 
                            className="absolute inset-0"
                            style={{
                              background: '#49837D',
                              borderRadius: '9.6px',
                              opacity: 1,
                            }}
                          />
                          <div 
                            className="relative size-full"
                            style={{
                              boxShadow: isHovered 
                                ? '0 2px 8px rgba(73, 131, 125, 0.15)' 
                                : '0 1px 4px rgba(73, 131, 125, 0.1)',
                            }}
                          >
                            <div className="flex flex-row items-center justify-center size-full">
                              <div 
                                className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
                              >
                                <AnimatedHeartIcon 
                                  animate={false}
                                  animateFill={shouldAnimateFill}
                                  className=""
                                  filled={true}
                                  size={24}
                                  useFigmaPath={true}
                                />
                                <div 
                                  className="flex flex-col font-inter-tight font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
                                >
                                  <p className="leading-[normal] whitespace-pre">{t('providers.saved')}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    ) : (
                      <motion.div
                        key="speichern"
                        animate={{ opacity: 1, scale: 1 }}
                        className="size-full"
                        exit={{ opacity: 0, scale: 0.97, zIndex: 0 }}
                        initial={false}
                        style={{ 
                          zIndex: 1,
                          WebkitTransform: 'translateZ(0)',
                          transform: 'translateZ(0)',
                          willChange: 'transform',
                        }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                        <div 
                          className="relative rounded-[9.6px] size-full overflow-hidden"
                          style={{
                            WebkitTransform: 'translateZ(0)',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                            WebkitMaskImage: '-webkit-radial-gradient(white, white)',
                            maskImage: 'radial-gradient(white, white)',
                            isolation: 'isolate',
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                          }}
                        >
                          <motion.div 
                            animate={{
                              opacity: 1,
                            }}
                            className="absolute inset-0"
                            style={{
                              background: "#589d96",
                              borderRadius: '9.6px',
                              WebkitTransform: 'translateZ(0)',
                              transform: 'translateZ(0)',
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                          />
                          <motion.div 
                            animate={{
                              boxShadow: isHovered 
                                ? '0 2px 8px rgba(88, 157, 150, 0.15)' 
                                : '0 1px 4px rgba(88, 157, 150, 0.1)',
                            }}
                            className="relative size-full"
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex flex-row items-center justify-center size-full">
                              <div 
                                className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
                              >
                                <AnimatedHeartIcon 
                                  animate={wasBookmarked}
                                  filled={false}
                                  size={24}
                                  useFigmaPath={true}
                                />
                                <div 
                                  className="flex flex-col font-inter-tight font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
                                >
                                  <p className="leading-[normal] whitespace-pre">{t('providers.save')}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                  )}
                </motion.div>
              </div>
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
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    );
  },
  )
);

ProviderCard.displayName = 'ProviderCard';
