'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import { getAllTrustedImageUrls, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useBookmarkWithAuth } from '@/hooks/useBookmarkWithAuth';
import type { Provider } from '@/services/providers';
import { useCommunityServicesForProvider } from '@/hooks/useCommunityServices';
import { openNavigation, formatAddress, isAddressNavigable, normalizeInstagramUrl, normalizeWebsiteUrl } from '@/utils/navigationUtils';

interface ProviderDetailPageProps {
  provider: Provider;
  customActionButtons?: React.ReactNode;
  backPath?: string;
}

export const ProviderDetailPage: React.FC<ProviderDetailPageProps> = ({ provider, customActionButtons, backPath }) => {
  const router = useRouter();
  
  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Process images using shared utility
  const imageUrls = getAllTrustedImageUrls(provider.provider_images);
  const allImageUrls = imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGE];

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
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [expandedBarakah, setExpandedBarakah] = useState(true);

  // Determine if this is a community service or provider
  const isCommunityService = !!provider.community_service_id;
  const bookmarkableType = isCommunityService ? 'community_service' : 'provider';
  const bookmarkableId = isCommunityService ? provider.community_service_id : provider.provider_id;

  // Use the new bookmark hook with authentication (after variables are declared)
  const { handleBookmarkAction: checkAuthBeforeBookmark, showBookmarkSuccess, showBookmarkRemoved } = useBookmarkWithAuth({
    bookmarkableId: bookmarkableId || '',
    bookmarkableType,
  });

  // Use React Query for caching community services
  const { 
    data: communityServices = [], 
    isLoading: isLoadingCommunityServices
  } = useCommunityServicesForProvider(provider.provider_id);

  // Fetch bookmark status
  useEffect(() => {
    const fetchBookmark = async () => {
      if (!user) return;
      try {
        const { data: existingBookmark, error: fetchError } = await supabase
          .from('bookmarks')
          .select('id')
          .match({
            bookmarkable_id: bookmarkableId,
            bookmarkable_type: bookmarkableType,
            user_id: user.id,
          })
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching bookmark:', fetchError);
          return;
        }
        setIsSaved(!!existingBookmark);
      } catch {
        console.error('Error in fetchBookmark');
      }
    };
    void fetchBookmark();
  }, [user, bookmarkableId, bookmarkableType]);

  // Community services are now fetched via React Query hook above

  const handleBookmark = async () => {
    // Check authentication first - this will show toast if not logged in
    const canProceed = await checkAuthBeforeBookmark();
    if (!canProceed) {
      return;
    }
    
    // Show animation if bookmarking (not unbookmarking)
    if (!isSaved) {
      setShowAllahumaBarik(true);
      setTimeout(() => {
        setShowAllahumaBarik(false);
      }, 900);
    }
    
    try {
      const { data: existingBookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .match({
          bookmarkable_id: bookmarkableId,
          bookmarkable_type: bookmarkableType,
          user_id: user?.id || '',
        })
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingBookmark) {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);
        if (deleteError) throw deleteError;
        setIsSaved(false);
        showBookmarkRemoved();
      } else {
        const { error: insertError } = await supabase.from('bookmarks').insert({
          bookmarkable_id: bookmarkableId,
          bookmarkable_type: bookmarkableType,
          user_id: user?.id || '',
        });
        if (insertError) throw insertError;
        setIsSaved(true);
        showBookmarkSuccess();
      }
    } catch {
      console.error('Error toggling bookmark');
    }
  };

  // Action handlers
  const handleBookmarkAction = () => {
    void handleBookmark();
  };

  const handleShareAction = () => {
    // Generate the correct URL based on type
    const path = isCommunityService 
      ? `/community-services/${provider.community_service_id}`
      : `/providers/${provider.provider_id}`;
    const shareUrl = `${window.location.origin}${path}`;
    
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

  // Mobile version
  if (isMobile) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] overflow-y-auto">
        {/* Mobile Content */}
        <div className="pb-24">
          <MobileProviderDetail provider={provider} onBack={handleBack} />
          
          {/* Provider Info Card */}
          <div className="mx-6 mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-inter-tight text-xl font-semibold text-gray-900">
              {provider.provider_name}
            </h2>
            {provider.address_city ? (
              <button
                className="mt-1 text-gray-600 hover:text-blue-600 hover:underline disabled:cursor-default disabled:hover:text-gray-600 disabled:hover:no-underline text-left"
                disabled={!isAddressNavigable(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined)}
                title="Adresse antippen zum Navigieren"
                onClick={() => {
                  const address = formatAddress(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined);
                  if (isAddressNavigable(provider.address_street ?? undefined, provider.address_zip ?? undefined, provider.address_city ?? undefined)) {
                    openNavigation(address);
                  }
                }}
              >
                {provider.address_street && provider.address_zip 
                  ? `${provider.address_street}, ${provider.address_zip} ${provider.address_city}`
                  : provider.address_city}
              </button>
            ) : (
              <div className="mt-1 text-gray-600">
                Online
              </div>
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

          {/* Barakah Effect Section */}
          {isLoadingCommunityServices ? (
            <div className="mx-6 mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-gray-200 rounded w-40"></div>
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (communityServices && communityServices.length > 0) && (
            <div className="mx-6 mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setExpandedBarakah(!expandedBarakah)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-inter-tight text-lg font-semibold text-gray-900">
                    Unser Barakah Effekt
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
                      onClick={() => router.push(`/community-services/${service.community_service_id}`)}
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                        <Image
                          fill
                          alt={service.community_service_name}
                          className="object-cover"
                          src={
                            service.community_service_images && service.community_service_images.length > 0
                              ? service.community_service_images[0]
                              : PLACEHOLDER_IMAGE
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-inter-tight font-medium text-gray-900">
                          {service.community_service_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {service.category?.name_de || 'Spenden'}
                        </p>
                        <p className="text-sm text-gray-600">
                          +{service.donation_count || 10} {service.category?.name_de === 'Moschee' ? 'Initiativen unterstützt' : 'Spenden'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Combined Offers & Needs Section */}
          {((provider.offers && provider.offers.length > 0) || (provider.needs && provider.needs.length > 0)) && (
            <div className="mx-6 mt-4 rounded-2xl bg-white shadow-sm">
              {/* Offers Section */}
              {provider.offers && provider.offers.length > 0 && (
                <div className="p-4">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedOffers(!expandedOffers)}
                  >
                    <h3 className="font-inter-tight text-lg font-semibold text-gray-900">
                      Wir bieten
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
                            className="inline-flex items-center rounded-xl bg-[#589D96]/10 px-3 py-1.5 text-sm font-medium text-[#589D96]"
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
              {provider.offers && provider.offers.length > 0 && provider.needs && provider.needs.length > 0 && (
                <hr className="mx-4 border-gray-200" />
              )}

              {/* Needs Section */}
              {provider.needs && provider.needs.length > 0 && (
                <div className="p-4">
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => setExpandedNeeds(!expandedNeeds)}
                  >
                    <h3 className="font-inter-tight text-lg font-semibold text-gray-900">
                      Wir suchen
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
                            className="inline-flex items-center rounded-xl bg-[#589D96]/10 px-3 py-1.5 text-sm font-medium text-[#589D96]"
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

        </div>

        {/* Mobile Action Buttons - Fixed at bottom */}
        {customActionButtons ? (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
            <div className="flex w-full gap-3.5">
              {customActionButtons}
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
            <div className="flex w-full gap-3.5">
              {/* Save Button */}
              <button
                aria-label={isSaved ? 'Gespeichert entfernen' : 'Provider speichern'}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-base font-medium shadow transition ${
                  showAllahumaBarik
                    ? 'border border-[#D2B581] bg-white'
                    : isSaved
                    ? 'bg-[#589D96] text-white'
                    : 'bg-mint text-white hover:bg-mint/90'
                }`}
                onClick={handleBookmarkAction}
              >
                <Icon
                  className={`h-5 w-5 ${showAllahumaBarik ? 'text-[#D2B581]' : ''}`}
                  icon={isSaved ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                />
                {showAllahumaBarik ? (
                  <span className="bg-gold-gradient bg-clip-text text-transparent">
                    Allahuma Barik
                  </span>
                ) : isSaved ? (
                  'Gespeichert'
                ) : (
                  'Speichern'
                )}
              </button>

              {/* Share Button */}
              <button
                aria-label="Provider teilen"
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
                onClick={handleShareAction}
              >
                <Icon className="h-5 w-5 text-gray-700" icon="lucide:share-2" />
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Desktop version - similar to existing modal but as a page
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-inter-tight">Zurück</span>
            </button>
            <h1 className="font-inter-tight text-2xl font-bold text-gray-900">
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
              className="relative h-[480px] w-full overflow-hidden rounded-3xl bg-gray-200 touch-pan-x cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'pan-x', userSelect: 'none' }}
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
                      selectedImageIdx === i ? 'border-[#589D96]' : 'border-transparent'
                    }`}
                    style={{ width: 80, height: 60 }}
                    onClick={() => goToImage(i)}
                  >
                    <Image
                      fill
                      alt={`${provider.provider_name} thumbnail ${i + 1}`}
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
              <h2 className="font-inter-tight text-3xl font-bold text-gray-900">
                {provider.provider_name}
              </h2>
              <p className="mt-2 text-gray-600">
                {provider.category?.name_de || ''}
              </p>
              
              {/* Contact Actions */}
              <div className="mt-6 flex items-center gap-4">
                {provider.social_website && (
                  <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => provider.social_website && window.open(provider.social_website, '_blank')}
                  >
                    <Icon className="h-4 w-4" icon="mdi:internet" />
                    Website
                  </button>
                )}
                {provider.contact_phone && (
                  <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(`tel:${provider.contact_phone}`)}
                  >
                    <Icon className="h-4 w-4" icon="entypo:old-phone" />
                    Anrufen
                  </button>
                )}
              </div>
            </div>

            {/* Barakah Effect - Show loading state or content */}
            {isLoadingCommunityServices ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (communityServices && communityServices.length > 0) && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setExpandedBarakah(!expandedBarakah)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-inter-tight text-2xl font-semibold text-gray-900">
                      Unser Barakah Effekt
                    </h3>
                    <Icon className="h-5 w-5 text-gray-500" icon="material-symbols:info-outline" />
                  </div>
                  <ChevronDown 
                    className={`h-7 w-7 text-gray-600 transition-transform ${
                      expandedBarakah ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {expandedBarakah && (
                  <div className="mt-4 space-y-3">
                    {communityServices.map((service, index) => (
                      <button
                        key={index}
                        className="flex w-full items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                        onClick={() => router.push(`/community-services/${service.community_service_id}`)}
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                          <Image
                            fill
                            alt={service.community_service_name}
                            className="object-cover"
                            src={
                              service.community_service_images && service.community_service_images.length > 0
                                ? service.community_service_images[0]
                                : PLACEHOLDER_IMAGE
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter-tight font-semibold text-gray-900">
                            {service.community_service_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {service.category?.name_de || 'Spenden'}
                          </p>
                          <p className="text-sm text-gray-600">
                            +{service.donation_count || 10} {service.category?.name_de === 'Moschee' ? 'Initiativen unterstützt' : 'Spenden'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Combined Offers & Needs Section */}
            {((provider.offers && provider.offers.length > 0) || (provider.needs && provider.needs.length > 0)) && (
              <div className="rounded-2xl bg-white shadow-sm">
                {/* Offers Section */}
                {provider.offers && provider.offers.length > 0 && (
                  <div className="p-6">
                    <button
                      className="flex w-full items-center justify-between"
                      onClick={() => setExpandedOffers(!expandedOffers)}
                    >
                      <h3 className="font-inter-tight text-2xl font-semibold text-gray-900">
                        Wir bieten
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
                              className="inline-flex items-center rounded-xl bg-[#589D96]/10 px-3 py-1.5 text-sm font-medium text-[#589D96]"
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
                {provider.offers && provider.offers.length > 0 && provider.needs && provider.needs.length > 0 && (
                  <hr className="mx-4 border-gray-200" />
                )}

                {/* Needs Section */}
                {provider.needs && provider.needs.length > 0 && (
                  <div className="p-6">
                    <button
                      className="flex w-full items-center justify-between"
                      onClick={() => setExpandedNeeds(!expandedNeeds)}
                    >
                      <h3 className="font-inter-tight text-2xl font-semibold text-gray-900">
                        Wir suchen
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
                              className="inline-flex items-center rounded-xl bg-[#589D96]/10 px-3 py-1.5 text-sm font-medium text-[#589D96]"
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


            {/* Action Buttons */}
            {customActionButtons ? (
              <div className="flex gap-4">
                {customActionButtons}
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-6 font-inter-tight font-medium transition-colors ${
                    showAllahumaBarik
                      ? 'border border-[#D2B581] bg-white'
                      : isSaved
                      ? 'bg-[#589D96] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={handleBookmarkAction}
                >
                  <Icon
                    className={`h-5 w-5 ${showAllahumaBarik ? 'text-[#D2B581]' : ''}`}
                    icon={isSaved ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                  />
                  {showAllahumaBarik ? (
                    <span className="bg-gold-gradient bg-clip-text text-transparent">
                      Allahuma Barik
                    </span>
                  ) : isSaved ? (
                    'Gespeichert'
                  ) : (
                    'Speichern'
                  )}
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 px-6 font-inter-tight font-medium text-gray-700 hover:bg-gray-50"
                  onClick={handleShareAction}
                >
                  <Icon className="h-5 w-5" icon="material-symbols:share" />
                  Teilen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
