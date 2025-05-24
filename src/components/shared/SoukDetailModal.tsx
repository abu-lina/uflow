/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState, useEffect } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import type { Souk } from '@/services/souks';
import { getZakatProjectsForSouk, type ZakatData } from '@/services/zakat_projects';
import { Modal } from '@/components/ui/Modal';

interface SoukDetailModalProps {
  souk: Souk;
  onClose: () => void;
  onBookmarkChange?: (soukId: string, isBookmarked: boolean) => void;
}

export const SoukDetailModal: React.FC<SoukDetailModalProps> = ({
  souk,
  onClose,
  onBookmarkChange,
}) => {
  function hasUrls(obj: unknown): obj is { urls: string[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      Array.isArray((obj as { urls?: unknown }).urls) &&
      (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
    );
  }

  // Only allow images from trusted domains
  const TRUSTED_IMAGE_DOMAINS = [
    'pmbatjlosstytdmmqkky.supabase.co',
    // add more trusted domains here if needed
  ];

  function isTrustedUrl(url: string) {
    try {
      const { hostname } = new URL(url);
      return TRUSTED_IMAGE_DOMAINS.some((domain) => hostname.endsWith(domain));
    } catch {
      return false;
    }
  }

  const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

  const allImageUrls = (() => {
    try {
      if (!souk.souk_images) {
        return [PLACEHOLDER_IMAGE];
      }
      let imagesData: { urls?: string[] } = {};
      if (typeof souk.souk_images === 'string') {
        try {
          imagesData = JSON.parse(souk.souk_images) as { urls?: string[] };
        } catch {
          imagesData = {};
        }
      } else if (Array.isArray(souk.souk_images)) {
        imagesData.urls = souk.souk_images;
      } else if (hasUrls(souk.souk_images)) {
        imagesData = souk.souk_images;
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
  const mainImageUrl =
    allImageUrls[selectedImageIdx] ||
    'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';

  const [expandedAction, setExpandedAction] = useState<'save' | 'share' | 'call' | 'website'>(
    'save',
  );

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [zakatProjects, setZakatProjects] = useState<ZakatData[]>([]);

  useEffect(() => {
    const fetchBookmark = async () => {
      if (!user) {
        return;
      }
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('bookmarkable_id', souk.souk_id)
        .eq('bookmarkable_type', 'souk')
        .eq('user_id', user.id)
        .single();
      setIsSaved(!!existingBookmark);
    };
    void fetchBookmark();
  }, [user, souk.souk_id]);

  useEffect(() => {
    async function fetchZakat() {
      try {
        const data = await getZakatProjectsForSouk(souk.souk_id);
        console.log('DEBUG: souk_id', souk.souk_id, 'Fetched zakat projects:', data);
        setZakatProjects(data);
      } catch (error) {
        console.error('DEBUG: Error fetching zakat projects', error);
      }
    }
    fetchZakat();
  }, [souk.souk_id]);

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Bitte melde dich an, um Souks zu speichern');
      return;
    }
    try {
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('bookmarkable_id', souk.souk_id)
        .eq('bookmarkable_type', 'souk')
        .eq('user_id', user.id)
        .single();
      if (existingBookmark) {
        const { error } = await supabase.from('bookmarks').delete().eq('id', existingBookmark.id);
        if (error) {
          throw error;
        }
        setIsSaved(false);
        toast.success('Souk entfernt');
        if (typeof onBookmarkChange === 'function') {
          onBookmarkChange(souk.souk_id, false);
        }
      } else {
        const { error } = await supabase.from('bookmarks').insert({
          bookmarkable_id: souk.souk_id,
          bookmarkable_type: 'souk',
          user_id: user.id,
        });
        if (error) {
          throw error;
        }
        setIsSaved(true);
        toast.success('Souk gespeichert');
        if (typeof onBookmarkChange === 'function') {
          onBookmarkChange(souk.souk_id, true);
        }
      }
    } catch (error) {
      toast.error('Fehler beim Speichern des Souks');
    }
  };

  // Action handlers
  const handleExpand = (action: 'save' | 'share' | 'call' | 'website') => {
    setExpandedAction(action);
    if (action === 'save') {
      void handleBookmark();
    }
    if (action === 'share') {
      if (navigator.share) {
        void navigator.share({
          title: souk.souk_name,
          text: souk.souk_description || '',
          url: window.location.href,
        });
      } else {
        void navigator.clipboard.writeText(window.location.href);
      }
    } else if (action === 'call' && souk.contact_phone) {
      window.open(`tel:${souk.contact_phone}`);
    } else if (action === 'website' && souk.social_website) {
      window.open(souk.social_website, '_blank');
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Modal isOpen={true} onClose={onClose} title={zakatProjects[0]?.zakat_name || souk.souk_name}>
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
                {souk.souk_name}
              </div>
            </div>
            <div className="text-uFlowText2 justify-start self-stretch font-inter text-base font-normal">
              {souk.category?.name_de || ''}
            </div>
          </div>
          {/* Main Image & Thumbnails */}
          <div className="flex h-[640px] flex-col items-start justify-start gap-4">
            <div className="bg-uFlowAccent relative h-[480px] w-[640px] overflow-hidden rounded-[32px]">
              <Image
                fill
                alt={souk.souk_name}
                className="rounded-[32px] object-cover"
                src={mainImageUrl}
              />
            </div>
            {/* Thumbnails */}
            {allImageUrls.length > 1 && (
              <div className="flex items-start gap-4" style={{ gap: '16px' }}>
                {allImageUrls.map((img, i) => (
                  <button
                    key={i}
                    aria-label={`Bild ${i + 1} auswählen`}
                    className={`relative overflow-hidden rounded-[8px] border-2 ${selectedImageIdx === i ? 'border-mint' : 'border-transparent'}`}
                    style={{ width: 80, height: 60 }}
                    type="button"
                    onClick={() => setSelectedImageIdx(i)}
                  >
                    <Image
                      fill
                      alt={`${souk.souk_name} thumbnail ${i + 1}`}
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
                        src={
                          zakatProjects[0]?.zakat_images && zakatProjects[0].zakat_images.length > 0
                            ? zakatProjects[0].zakat_images[0]
                            : PLACEHOLDER_IMAGE
                        }
                        alt={zakatProjects[0]?.zakat_name || 'Zakat Projekt'}
                        fill
                        className="rounded-[18px] object-cover"
                      />
                    </div>
                    <div className="text-uFlowText mb-0.5 font-inter-tight text-lg font-semibold">
                      {zakatProjects[0]?.zakat_name}
                    </div>
                    <div className="text-uFlowText2 font-inter-tight text-base">Hatem Ipsum</div>
                  </div>
                  {/* Divider */}
                  <div className="mx-4 h-[120px] w-px bg-zinc-200" />
                  {/* Right: Barakah labels */}
                  <div className="flex min-h-[120px] flex-col flex-wrap items-start gap-2">
                    {Array.isArray(souk.barakah_effects) && souk.barakah_effects.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {souk.barakah_effects.map((effect, idx) => (
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
            {/* Beschreibung Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="inline-flex items-start justify-between self-stretch">
                  <div className="inline-flex flex-1 flex-col items-start justify-start gap-2">
                    <div className="text-uFlowText h-10 w-48 justify-start font-inter-tight text-2xl font-semibold">
                      Beschreibung:
                    </div>
                    <div className="justify-start self-stretch font-inter-tight text-base font-normal leading-tight text-neutral-800">
                      {souk.souk_description ?? ''}
                    </div>
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
                      {souk.address_street}, <br />
                      {souk.address_zip} {souk.address_city}
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
