'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { Provider } from '@/services/providers';
import { getCommunityServicesForProvider, type CommunityServiceData } from '@/services/community_services';

interface ProviderDetailPageProps {
  provider: Provider;
}

export const ProviderDetailPage: React.FC<ProviderDetailPageProps> = ({ provider }) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Image handling
  const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';
  
  function hasUrls(obj: unknown): obj is { urls: string[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      Array.isArray((obj as { urls?: unknown }).urls) &&
      (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
    );
  }

  function isTrustedUrl(url: string) {
    try {
      const { hostname } = new URL(url);
      const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      return hostname === supabaseUrl.hostname;
    } catch {
      return false;
    }
  }

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

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [communityServices, setCommunityServices] = useState<CommunityServiceData[]>([]);
  const [expandedOffers, setExpandedOffers] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState(false);
  const [expandedBarakah, setExpandedBarakah] = useState(true);


  // Navigation functions
  const goToNext = useCallback(() => {
    setSelectedImageIdx((prev) => (prev + 1) % allImageUrls.length);
  }, [allImageUrls.length]);

  const goToPrevious = useCallback(() => {
    setSelectedImageIdx((prev) => (prev - 1 + allImageUrls.length) % allImageUrls.length);
  }, [allImageUrls.length]);

  const goToImage = (index: number) => {
    setSelectedImageIdx(index);
  };

  // Touch/Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (allImageUrls.length <= 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartY(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || allImageUrls.length <= 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const offsetX = currentX - dragStartX;
    const offsetY = Math.abs(currentY - dragStartY);

    if (Math.abs(offsetX) > offsetY) {
      if (
        (selectedImageIdx === 0 && offsetX > 0) ||
        (selectedImageIdx === allImageUrls.length - 1 && offsetX < 0)
      ) {
        setDragOffset(offsetX * 0.1);
      } else {
        setDragOffset(offsetX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || allImageUrls.length <= 1) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const threshold = 80;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && selectedImageIdx > 0) {
        goToPrevious();
      } else if (dragOffset < 0 && selectedImageIdx < allImageUrls.length - 1) {
        goToNext();
      }
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  // Fetch bookmark status
  useEffect(() => {
    const fetchBookmark = async () => {
      if (!user) return;
      try {
        const { data: existingBookmark, error: fetchError } = await supabase
          .from('bookmarks')
          .select('id')
          .match({
            bookmarkable_id: provider.provider_id,
            bookmarkable_type: 'provider',
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
  }, [user, provider.provider_id]);

  // Fetch community services
  useEffect(() => {
    async function fetchCommunityServices() {
      try {
        const data = await getCommunityServicesForProvider(provider.provider_id);
        setCommunityServices(data || []);
      } catch (error) {
        console.error('Error fetching community services:', error);
        setCommunityServices([]);
      }
    }
    fetchCommunityServices();
  }, [provider.provider_id]);

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Bitte melde dich an, um Provider zu speichern');
      return;
    }
    try {
      const { data: existingBookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .match({
          bookmarkable_id: provider.provider_id,
          bookmarkable_type: 'provider',
          user_id: user.id,
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
        toast.success('Provider entfernt');
      } else {
        const { error: insertError } = await supabase.from('bookmarks').insert({
          bookmarkable_id: provider.provider_id,
          bookmarkable_type: 'provider',
          user_id: user.id,
        });
        if (insertError) throw insertError;
        setIsSaved(true);
        toast.success('Provider gespeichert');
      }
    } catch {
      console.error('Error toggling bookmark');
      toast.error('Fehler beim Speichern des Providers');
    }
  };

  // Action handlers
  const handleBookmarkAction = () => {
    void handleBookmark();
  };

  const handleShareAction = () => {
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

  // Mobile version
  if (isMobile) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] overflow-y-auto">
        {/* Mobile Content */}
        <div className="pb-24">
          <MobileProviderDetail provider={provider} />
          
          {/* Provider Info Card */}
          <div className="mx-6 mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-inter-tight text-xl font-semibold text-gray-900">
              {provider.provider_name}
            </h2>
            <p className="mt-1 text-gray-600">
              {provider.address_street}, {provider.address_zip} {provider.address_city}
            </p>
            
            {/* Contact Icons */}
            <div className="mt-4 flex items-center gap-4">
              {provider.social_website && (
                <button
                  className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
                  onClick={() => provider.social_website && window.open(provider.social_website, '_blank')}
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
                    if (provider.social_instagram) {
                      window.open(provider.social_instagram, '_blank');
                    }
                  }}
                >
                  <Icon className="h-5 w-5 text-gray-600" icon="mdi:instagram" />
                </button>
              )}
            </div>
          </div>

          {/* Barakah Effect Section */}
          {communityServices && communityServices.length > 0 && (
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
                    <div key={index} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-sm">
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
                      <div className="flex-1">
                        <p className="font-inter-tight font-medium text-gray-900">
                          {service.community_service_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Initiativen unterstützt
                        </p>
                      </div>
                    </div>
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
          <div className="flex w-full gap-3.5">
            {/* Save Button */}
            <button
              aria-label={isSaved ? 'Gespeichert entfernen' : 'Provider speichern'}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-base font-medium shadow transition ${
                isSaved
                  ? 'bg-[#589D96] text-white'
                  : 'bg-mint text-white hover:bg-mint/90'
              }`}
              onClick={handleBookmarkAction}
            >
              <Icon
                className="h-5 w-5"
                icon={isSaved ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
              />
              {isSaved ? 'Gespeichert' : 'Speichern'}
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
              onClick={() => router.back()}
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
            <div className="relative h-[480px] w-full overflow-hidden rounded-3xl bg-gray-200">
              <div
                ref={imageContainerRef}
                className="flex h-full w-full"
                style={{
                  transform: isDragging && Math.abs(dragOffset) > 10
                    ? `translateX(calc(-${selectedImageIdx * 100}% + ${dragOffset}px))`
                    : `translateX(-${selectedImageIdx * 100}%)`,
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
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

              {/* Image Counter */}
              {allImageUrls.length > 1 && (
                <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {selectedImageIdx + 1} / {allImageUrls.length}
                </div>
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

            {/* Barakah Effect */}
            {communityServices && communityServices.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <button
                  className="flex w-full items-center justify-between"
                  onClick={() => setExpandedBarakah(!expandedBarakah)}
                >
                  <h3 className="font-inter-tight text-2xl font-semibold text-gray-900">
                    Unser Barakah Effekt
                  </h3>
                  <ChevronDown 
                    className={`h-7 w-7 text-gray-600 transition-transform ${
                      expandedBarakah ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {expandedBarakah && (
                  <div className="mt-4 space-y-4">
                    {communityServices.map((service, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-sm">
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
                        <div>
                          <p className="font-inter-tight font-semibold text-gray-900">
                            {service.community_service_name}
                          </p>
                          <p className="text-gray-600">
                            Initiativen unterstützt
                          </p>
                        </div>
                      </div>
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
            <div className="flex gap-4">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-6 font-inter-tight font-medium transition-colors ${
                  isSaved
                    ? 'bg-[#589D96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={handleBookmarkAction}
              >
                <Icon
                  className="h-5 w-5"
                  icon={isSaved ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
                />
                {isSaved ? 'Gespeichert' : 'Speichern'}
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 px-6 font-inter-tight font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleShareAction}
              >
                <Icon className="h-5 w-5" icon="material-symbols:share" />
                Teilen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
