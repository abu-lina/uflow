'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import { getAllTrustedImageUrls, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';
import type { Provider } from '@/services/providers';
import { useCommunityServicesForProvider } from '@/hooks/useCommunityServices';

interface ProfileProviderDetailPageProps {
  provider: Provider;
}

export const ProfileProviderDetailPage: React.FC<ProfileProviderDetailPageProps> = ({ provider }) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Process images using shared utility
  const allImageUrls = getAllTrustedImageUrls(provider.provider_images);

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
  });

  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState(false);

  // Load community services for this provider
  const { data: communityServices } = useCommunityServicesForProvider(provider.provider_id);



  const handleEditAction = () => {
    // Navigate to edit page or open edit modal
    router.push(`/profile/providers/${provider.provider_id}/edit`);
  };

  const handleMoreActions = () => {
    // Open more actions menu or modal
    console.log('More actions clicked');
  };

  if (!isMobile) {
    return (
      <div className="flex h-screen-fix items-center justify-center">
        <span className="text-lg text-gray-500">
          Bitte nutze die Mobile-Ansicht für die Detailansicht.
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen-fix w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          {/* Back Button */}
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>

          {/* Title */}
          <h1 className="text-xl font-semibold text-content-heading">
            {provider.provider_name}
          </h1>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-[calc(env(safe-area-inset-top)+24px+40px)]" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {/* Image Gallery */}
          {allImageUrls.length > 0 && (
            <div className="relative">
              <div
                ref={imageContainerRef}
                className="relative h-[300px] overflow-hidden bg-gray-100"
                style={{ touchAction: 'pan-y' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
              >
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={getTransformStyle()}
                >
                  {allImageUrls.map((imageUrl, index) => (
                    <div key={index} className="relative flex-shrink-0 w-full h-full">
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
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                      disabled={selectedImageIdx === 0}
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                      disabled={selectedImageIdx === allImageUrls.length - 1}
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Image Indicators */}
                {allImageUrls.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {allImageUrls.map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 rounded-full transition-colors ${
                          index === selectedImageIdx ? 'bg-white' : 'bg-white/50'
                        }`}
                        style={{ width: index === selectedImageIdx ? '16px' : '8px' }}
                        onClick={() => goToImage(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-6">
            <MobileProviderDetail provider={provider} />

            {/* Community Services */}
            {communityServices && communityServices.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-[#232323]">Verknüpfte Initiativen</h3>
                <div className="space-y-3">
                  {communityServices.map((service) => {
                    const firstImageUrl = service.community_service_images ? 
                      (() => {
                        try {
                          const imagesData = typeof service.community_service_images === 'string' 
                            ? JSON.parse(service.community_service_images)
                            : service.community_service_images;
                          return imagesData.urls?.[0] || PLACEHOLDER_IMAGE;
                        } catch {
                          return PLACEHOLDER_IMAGE;
                        }
                      })() 
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
                        key={service.community_service_id}
                        className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                        onClick={() => router.push(`/community-services/${service.community_service_id}`)}
                        onMouseEnter={handleMouseEnter}
                      >
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                          <Image
                            alt={service.community_service_name}
                            className="h-full w-full object-cover"
                            height={48}
                            src={firstImageUrl}
                            width={48}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#232323]">{service.community_service_name}</h4>
                          <p className="text-sm text-[#666]">{service.community_service_description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Offers Section */}
            {provider.offers && provider.offers.length > 0 && (
              <div className="mt-6">
                <button
                  className="flex w-full items-center justify-between rounded-lg bg-white p-4 text-left"
                  onClick={() => setExpandedOffers(!expandedOffers)}
                >
                  <span className="font-medium text-[#232323]">
                    Angebote ({provider.offers.length})
                  </span>
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

            {/* Needs Section */}
            {provider.needs && provider.needs.length > 0 && (
              <div className="mt-6">
                <button
                  className="flex w-full items-center justify-between rounded-lg bg-white p-4 text-left"
                  onClick={() => setExpandedNeeds(!expandedNeeds)}
                >
                  <span className="font-medium text-[#232323]">
                    Gesucht ({provider.needs.length})
                  </span>
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

            {/* Profile-specific Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 px-6 font-inter-tight font-medium text-white hover:bg-primary-dark active:bg-primary-darker transition-colors"
                onClick={handleEditAction}
              >
                <Icon className="h-5 w-5" icon="material-symbols:edit" />
                Bearbeiten
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 px-6 font-inter-tight font-medium text-content hover:bg-gray-50 transition-colors"
                onClick={handleMoreActions}
              >
                <Icon className="h-5 w-5" icon="material-symbols:more-horiz" />
                ...
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
