'use client';

import React, { useEffect, useState } from 'react';

import Image from 'next/image';

import { X } from 'lucide-react';
import { toast } from 'sonner';

import { SoukActionBar } from '@/components/souks/SoukActionBar';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { getZakatProjectsForSouk, type ZakatData } from '@/services/zakat_projects';

interface SoukCardModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  category: string;
  title: string;
  description?: string;
  address_street?: string;
  address_zip?: string;
  address_city?: string;
  souk_id: string;
  barakah_effects?: string[];
  contact_phone?: string;
  social_website?: string;
  // Add more props as needed
}

export function SoukCardModal({
  open,
  onClose,
  imageUrl,
  category,
  title,
  description,
  address_street,
  address_zip,
  address_city,
  souk_id,
  barakah_effects = [],
  contact_phone,
  social_website,
}: SoukCardModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Fetch zakat projects for this souk
  const [zakatProjects, setZakatProjects] = React.useState<ZakatData[]>([]);
  useEffect(() => {
    async function fetchZakat() {
      if (!open || !souk_id) return;
      const data = await getZakatProjectsForSouk(souk_id);
      setZakatProjects(data || []);
    }
    fetchZakat();
  }, [open, souk_id]);

  // Swipe down to close (mobile) with visual feedback
  const [dragY, setDragY] = React.useState(0);
  const [isClosing, setIsClosing] = React.useState(false);
  const touchStartY = React.useRef<number | null>(null);
  const touchStartTime = React.useRef<number | null>(null);
  const allowSwipe = React.useRef(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 800); // Match the transition duration
  };

  function handleTouchStart(e: React.TouchEvent) {
    // Don't prevent default - let the browser handle scrolling
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    allowSwipe.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartY.current || !allowSwipe.current || !touchStartTime.current) return;

    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaY = currentY - touchStartY.current;
    const deltaTime = currentTime - touchStartTime.current;

    // Calculate velocity (pixels per millisecond)
    const velocity = Math.abs(deltaY) / deltaTime;

    // Only allow downward swipes (positive deltaY)
    if (deltaY > 0) {
      // Much more conservative threshold for iPhone SE
      const dragThreshold = 100; // Start moving after 100px

      // Only respond to natural swipe speeds (velocity < 2.0 px/ms)
      if (deltaY > dragThreshold && velocity < 2.0) {
        setDragY(deltaY - dragThreshold);
      }
    } else if (deltaY < 0) {
      // Reset everything on upward movement to prevent accidental closing
      setDragY(0);
      allowSwipe.current = false;
      touchStartY.current = null;
      touchStartTime.current = null;
    }
    // Completely ignore upward scrolls (negative deltaY) - let browser handle them
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartY.current || !touchStartTime.current) return;

    const currentY = e.changedTouches[0].clientY;
    const currentTime = Date.now();
    const deltaY = currentY - touchStartY.current;
    const deltaTime = currentTime - touchStartTime.current;

    // Calculate velocity
    const velocity = Math.abs(deltaY) / deltaTime;

    // Only close on downward swipes (positive deltaY) with natural velocity
    if (deltaY > 0 && velocity < 2.0) {
      // Much higher threshold for closing on iPhone SE
      if (deltaY > 400) {
        handleClose();
        touchStartY.current = null;
        touchStartTime.current = null;
        setDragY(0);
        return;
      }

      // If not enough to close, snap back
      if (dragY > 200) {
        handleClose();
      }
    }

    setDragY(0);
    touchStartY.current = null;
    touchStartTime.current = null;
    allowSwipe.current = false;
  }

  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

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
            bookmarkable_id: souk_id,
            bookmarkable_type: 'souk',
            user_id: user.id,
          })
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching bookmark:', fetchError);
          return;
        }
        setIsSaved(!!existingBookmark);
      } catch (error) {
        console.error('Error in fetchBookmark:', error);
      }
    };
    void fetchBookmark();
  }, [user, souk_id]);

  const handleSave = async () => {
    if (!user) {
      toast.error('Bitte melde dich an, um Souks zu speichern');
      return;
    }
    try {
      const { data: existingBookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .match({
          bookmarkable_id: souk_id,
          bookmarkable_type: 'souk',
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
        toast.success('Souk entfernt');
      } else {
        const { error: insertError } = await supabase.from('bookmarks').insert({
          bookmarkable_id: souk_id,
          bookmarkable_type: 'souk',
          user_id: user.id,
        });
        if (insertError) throw insertError;
        setIsSaved(true);
        toast.success('Souk gespeichert');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Fehler beim Speichern des Souks');
    }
  };

  // Share handler
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/souks/${souk_id}`;
    if (navigator.share) {
      navigator.share({
        title,
        text: description || '',
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link kopiert!');
    }
  };

  // Call handler
  const handleCall = () => {
    if (contact_phone) {
      window.open(`tel:${contact_phone}`);
    }
  };

  // Website handler
  const handleWebsite = () => {
    if (social_website) {
      window.open(social_website, '_blank');
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Fullscreen overlay */}
      <div className="fixed inset-0 z-[99] bg-black/40" />
      {/* Modal container */}
      <div
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 top-6 z-[100] flex touch-pan-y items-start justify-center"
        style={{
          transform: isClosing ? 'translateY(100vh)' : dragY ? `translateY(${dragY}px)` : undefined,
          transition: isClosing
            ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
            : dragY === 0
              ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
              : 'none',
        }}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <div className="animate-fadeInUp relative h-full w-full max-w-[392px] overflow-y-auto rounded-t-[29.4px] bg-white pb-6 sm:rounded-[29.4px]">
          {/* Visual Section - Mobile Only */}
          <div className="relative h-96 w-full overflow-hidden rounded-t-[29.4px] sm:hidden">
            <Image
              fill
              priority
              alt="Souk Visual"
              className="border-uFlowWhite absolute left-0 top-0 h-full w-full rounded-t-[29.4px] border border-[1.1px] object-cover"
              draggable="false"
              src={imageUrl}
            />
            {/* Drag handle for swipe-to-close - positioned on top of image */}
            <div className="absolute left-1/2 top-2 z-10 h-2 w-16 -translate-x-1/2 rounded-full bg-gray-500 opacity-90 shadow-lg" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-start justify-end p-4">
              <div className="outline-uFlowDarkGrey inline-flex h-8 items-center justify-center overflow-hidden rounded-[9.54px] bg-white/70 px-2.5 outline outline-[0.79px] outline-offset-[-0.40px] backdrop-blur-[1.99px]">
                <div className="justify-center text-center font-inter-tight text-sm font-medium text-black">
                  {category}
                </div>
              </div>
            </div>
          </div>
          {/* Close Button */}
          <button
            aria-label="Schließen"
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 shadow"
            onClick={handleClose}
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
          {/* Visual Section - Desktop (unchanged) */}
          <div className="relative isolation-auto flex hidden h-[356px] w-full flex-col items-start justify-end gap-[12.25px] p-0 sm:block sm:w-[392px]">
            <div className="absolute left-0 top-0 z-0 h-full w-full">
              <Image
                fill
                priority
                alt="Souk Visual"
                className="rounded-t-[29.4px] border border-white object-cover"
                src={imageUrl}
                style={{ boxSizing: 'border-box' }}
              />
            </div>
            {/* LikeFrame and FABs would go here if needed, currently display: none */}
            <div className="z-10 flex h-[63.57px] w-full flex-col items-start justify-end px-[15.89px] sm:w-[392px]">
              <div className="flex h-[31.78px] w-[97.19px] flex-row items-center justify-center rounded-[9.54px] border border-[#CDCDCD] bg-white/70 px-[10.6px] backdrop-blur-[2px]">
                <span className="flex h-[22px] w-[76px] items-center text-center font-inter-tight text-[18.54px] font-medium leading-[22px] text-black">
                  {category}
                </span>
              </div>
            </div>
          </div>
          {/* Modal Content (Mobile Only) */}
          <div className="mx-auto flex w-[353px] flex-col items-start gap-5 overflow-x-hidden px-3 pb-24 sm:hidden sm:pb-6">
            {/* Title */}
            <div className="flex w-full flex-col items-start gap-1">
              <div className="w-full font-inter-tight text-[24px] font-semibold leading-[29px] text-[#232323]">
                {title}
              </div>
              <div className="w-full font-inter text-[16px] leading-[19px] text-[#7A7A7A]">
                {address_street && address_zip && address_city
                  ? `${address_street}, ${address_zip} ${address_city}`
                  : ''}
              </div>
            </div>
            {/* Barakah Section (only if zakat project exists) */}
            {zakatProjects.length > 0 && (
              <div className="flex w-full flex-col items-start gap-2">
                <div className="font-inter-tight text-[20px] font-semibold leading-6 text-[#232323]">
                  Unser Barakah Effekt:
                </div>
                {/* Barakah Image */}
                <div className="relative h-[198px] w-full overflow-hidden rounded-[16px] border border-[#959595]">
                  <img
                    alt={zakatProjects[0].zakat_name}
                    className="h-full w-full object-cover"
                    src={
                      zakatProjects[0].zakat_images && zakatProjects[0].zakat_images.length > 0
                        ? zakatProjects[0].zakat_images[0]
                        : '/images/placeholder.jpg'
                    }
                  />
                  {/* Barakah Title Overlay */}
                  <div className="absolute bottom-0 left-0 flex h-[41px] w-full items-center rounded-b-[16px] bg-white/10 px-2 backdrop-blur-[14px]">
                    <span className="font-inter-tight text-[17.2px] font-semibold leading-[21px] text-white">
                      {zakatProjects[0].zakat_name}
                    </span>
                  </div>
                </div>
                {/* Barakah Badges */}
                {Array.isArray(barakah_effects) && barakah_effects.length > 0 && (
                  <div className="mt-2 flex w-full flex-row flex-wrap gap-[9.8px]">
                    {barakah_effects.map((effect, idx) => (
                      <div
                        key={idx}
                        className="flex flex-row items-center gap-[12.25px] rounded-[4.9px] border border-[#CDCDCD] px-[5.3px] py-[2.6px]"
                      >
                        <span className="font-inter-tight text-[18.5px] font-medium text-[#232323]">
                          {effect}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Barakah Effects Section (when no zakat project but has effects) */}
            {zakatProjects.length === 0 &&
              Array.isArray(barakah_effects) &&
              barakah_effects.length > 0 && (
                <div className="flex w-full flex-col items-start gap-2">
                  <div className="font-inter-tight text-[20px] font-semibold leading-6 text-[#232323]">
                    Unser Barakah Effekt:
                  </div>
                  <div className="flex w-full flex-row flex-wrap gap-[9.8px]">
                    {barakah_effects.map((effect, idx) => (
                      <div
                        key={idx}
                        className="flex flex-row items-center gap-[12.25px] rounded-[4.9px] border border-[#CDCDCD] px-[5.3px] py-[2.6px]"
                      >
                        <span className="font-inter-tight text-[18.5px] font-medium text-[#232323]">
                          {effect}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {/* Description Section */}
            {description && (
              <div className="flex w-full flex-col gap-2 rounded-[16px] border border-[#EEEEEE] p-4">
                <div className="font-inter-tight text-[20px] font-semibold text-[#232323]">
                  Beschreibung:
                </div>
                <div className="font-inter-tight text-[16px] leading-[21px] text-[#272727]">
                  {description}
                </div>
              </div>
            )}
            {/* Opening Hours Section */}
            <div className="flex w-full flex-col gap-2 rounded-[16px] border border-[#EEEEEE] p-4">
              <div className="font-inter-tight text-[20px] font-semibold text-[#232323]">
                Öffnungszeiten:
              </div>
              <div className="flex w-full flex-row justify-between">
                <span className="font-inter-tight text-[16px] text-[#272727]">Mo - Fr:</span>
                <span className="text-right font-inter-tight text-[16px] text-[#272727]">
                  Fajr bis Isha
                </span>
              </div>
            </div>
          </div>
          {/* Sticky SoukActionBar at the bottom on mobile */}
          <div className="fixed bottom-0 left-0 right-0 z-[120] bg-white/95 px-4 pb-4 sm:hidden">
            <SoukActionBar
              isSaved={isSaved}
              phoneNumber={contact_phone}
              websiteUrl={social_website}
              onCall={handleCall}
              onSave={handleSave}
              onShare={handleShare}
              onWebsite={handleWebsite}
            />
          </div>
        </div>
      </div>
    </>
  );
}
