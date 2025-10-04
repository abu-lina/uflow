import React, { useState, useEffect, useRef, useCallback } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { MobileProviderDetail } from '@/components/providers/MobileProviderDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { Provider } from '@/services/providers';
import { getCommunityServicesForProvider, type CommunityServiceData } from '@/services/community_services';

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
  const isMobile = useIsMobile();
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

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // const mainImageUrl = // Commented out as it's not currently used
  //   allImageUrls[selectedImageIdx] ||
  //   'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';

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

  // Navigation functions
  const goToNext = useCallback(() => {
    console.log('Next clicked - current:', selectedImageIdx, 'total:', allImageUrls.length);
    setSelectedImageIdx((prev) => (prev + 1) % allImageUrls.length);
  }, [allImageUrls.length, selectedImageIdx]);

  const goToPrevious = useCallback(() => {
    console.log('Previous clicked - current:', selectedImageIdx, 'total:', allImageUrls.length);
    setSelectedImageIdx((prev) => (prev - 1 + allImageUrls.length) % allImageUrls.length);
  }, [allImageUrls.length, selectedImageIdx]);

  const goToImage = (index: number) => {
    console.log('Go to image clicked - index:', index);
    setSelectedImageIdx(index);
  };

  // Touch/Swipe handlers
  // Feature flag to disable image swiping
  const ENABLE_IMAGE_SWIPING = false;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!ENABLE_IMAGE_SWIPING || allImageUrls.length <= 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartY(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!ENABLE_IMAGE_SWIPING || !isDragging || allImageUrls.length <= 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const offsetX = currentX - dragStartX;
    const offsetY = Math.abs(currentY - dragStartY);

    // Only handle horizontal swipes, let vertical scrolls pass through
    if (Math.abs(offsetX) > offsetY) {
      // Prevent swiping beyond boundaries
      if (
        (selectedImageIdx === 0 && offsetX > 0) ||
        (selectedImageIdx === allImageUrls.length - 1 && offsetX < 0)
      ) {
        // Allow only small resistance movement
        setDragOffset(offsetX * 0.1);
      } else {
        setDragOffset(offsetX);
      }
    }
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    if (!ENABLE_IMAGE_SWIPING || !isDragging || allImageUrls.length <= 1) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const threshold = 80; // minimum distance to trigger swipe
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

  useEffect(() => {
    const fetchBookmark = async () => {
      if (!user) {
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

  useEffect(() => {
    async function fetchCommunityServices() {
      try {
        const data = await getCommunityServicesForProvider(provider.provider_id);
        console.log('DEBUG: provider_id', provider.provider_id, 'Fetched community services:', data);
        setCommunityServices(data);
      } catch {
        console.error('DEBUG: Error fetching community services');
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
        if (typeof onBookmarkChange === 'function') {
          onBookmarkChange(provider.provider_id, false);
        }
      } else {
        const { error: insertError } = await supabase.from('bookmarks').insert({
          bookmarkable_id: provider.provider_id,
          bookmarkable_type: 'provider',
          user_id: user.id,
        });
        if (insertError) throw insertError;
        setIsSaved(true);
        toast.success('Provider gespeichert');
        if (typeof onBookmarkChange === 'function') {
          onBookmarkChange(provider.provider_id, true);
        }
      }
    } catch {
      console.error('Error toggling bookmark');
      toast.error('Fehler beim Speichern des Providers');
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
      window.open(provider.social_website, '_blank');
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
          className="absolute right-6 top-6 z-50 flex size-10 items-center justify-center rounded-full bg-white/80 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
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
                  style={{
                    transform:
                      isDragging && Math.abs(dragOffset) > 10
                        ? `translateX(calc(-${selectedImageIdx * 100}% + ${dragOffset}px))`
                        : `translateX(-${selectedImageIdx * 100}%)`,
                    transition: isDragging
                      ? 'none'
                      : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
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

                {/* Image Counter */}
                {allImageUrls.length > 1 && (
                  <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                    {selectedImageIdx + 1} / {allImageUrls.length}
                  </div>
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
                      selectedImageIdx === i ? 'scale-105 border-mint' : 'border-transparent'
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
                  Unser Barakah Effekt:
                </div>
                <div className="flex w-full flex-row items-start gap-6">
                  {/* Left: Zakat image, name, subtitle */}
                  <div className="flex w-[160px] flex-shrink-0 flex-col items-start">
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
                  </div>
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
                            {effect === 'Iman' && <span className="text-lg">✨</span>}
                            {effect === 'Zakat' && <span className="text-lg">🌑</span>}
                            {effect === 'Sunnah' && <span className="text-lg">🕋</span>}
                            {!(effect === 'Iman' || effect === 'Zakat' || effect === 'Sunnah') && (
                              <span className="text-lg">🏷️</span>
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
                    <div className="text-uFlowText h-10 w-48 justify-start font-['Inter_Tight'] text-2xl font-semibold">
                      Adresse:
                    </div>
                    <div className="justify-start self-stretch font-['Inter_Tight'] text-base font-normal leading-tight text-neutral-800">
                      {provider.address_street}, <br />
                      {provider.address_zip} {provider.address_city}
                    </div>
                  </div>
                  <div className="relative w-0 self-stretch">
                    <div className="absolute left-0 top-0 h-0 w-40 origin-top-left rotate-90 outline outline-1 outline-offset-[-0.50px] outline-zinc-100" />
                  </div>
                  <div className="inline-flex flex-1 flex-col items-end justify-start gap-4 overflow-hidden">
                    <div className="text-uFlowText justify-start font-['Inter_Tight'] text-2xl font-semibold">
                      Öffnungszeiten:
                    </div>
                    <div className="inline-flex w-40 items-start justify-end gap-2">
                      <div className="w-14 justify-start font-['Inter_Tight'] text-base font-normal text-neutral-800">
                        Mo - Fr:
                      </div>
                      <div className="w-24 justify-start text-right font-['Inter_Tight'] text-base font-normal text-neutral-800">
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
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'save' ? 'w-auto gap-1 bg-[#589D96] px-3' : 'w-11 bg-transparent px-3'}`}
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
                {isSaved ? 'Gespeichert' : 'Speichern'}
              </span>
            )}
          </button>
          {/* Share Button */}
          <button
            aria-expanded={expandedAction === 'share'}
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'share' ? 'w-auto gap-1 bg-[#589D96] px-3' : 'w-11 bg-transparent px-3'}`}
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
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'call' ? 'w-auto gap-1 bg-[#589D96] px-3' : 'w-11 bg-transparent px-3'}`}
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
            className={`flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${expandedAction === 'website' ? 'w-auto gap-1 bg-[#589D96] px-3' : 'w-11 bg-transparent px-3'}`}
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
