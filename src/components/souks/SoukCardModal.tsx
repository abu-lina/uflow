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

const SWIPE_AREA_HEIGHT = 48; // px

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
  const touchStartY = React.useRef<number | null>(null);
  const allowSwipe = React.useRef(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if ((e.currentTarget as HTMLElement).scrollTop > 0) return;
    const modal = modalRef.current;
    if (modal) {
      const rect = modal.getBoundingClientRect();
      const touchY = e.touches[0].clientY - rect.top;
      if (touchY < SWIPE_AREA_HEIGHT) {
        allowSwipe.current = true;
        touchStartY.current = e.touches[0].clientY;
        setDragY(0);
        e.preventDefault(); // Prevent default to avoid conflicts
      } else {
        allowSwipe.current = false;
        touchStartY.current = null;
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!allowSwipe.current || touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
      e.preventDefault(); // Prevent default scrolling during drag
    }
    if (deltaY > 120) {
      // Reduced threshold for better responsiveness
      onClose();
      touchStartY.current = null;
      setDragY(0);
      allowSwipe.current = false;
    }
  }

  function handleTouchEnd() {
    if (dragY > 60) {
      // If dragged more than 60px, close the modal
      onClose();
    }
    setDragY(0);
    touchStartY.current = null;
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99] bg-black/40 transition-opacity duration-300"
        style={{
          opacity: dragY ? Math.max(0, 1 - dragY / 200) : 1,
        }}
      />

      {/* Modal Container - Revolut Style */}
      <div
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 z-[100] flex justify-center"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY === 0 ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        }}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        {/* Modal Content */}
        <div className="relative w-full max-w-[392px] rounded-t-[24px] bg-white shadow-2xl">
          {/* Drag Handle - Revolut Style */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-12 rounded-full bg-gray-300" />
          </div>

          {/* Close Button */}
          <button
            aria-label="Schließen"
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>

          {/* Image Section */}
          <div className="relative h-80 w-full overflow-hidden rounded-t-[24px]">
            <Image fill priority alt="Souk Visual" className="object-cover" src={imageUrl} />
            {/* Category Badge */}
            <div className="absolute bottom-4 left-4">
              <div className="rounded-lg bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-sm font-medium text-gray-900">{category}</span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-4 py-6">
            {/* Title and Address */}
            <div className="mb-4">
              <h2 className="mb-1 text-xl font-semibold text-gray-900">{title}</h2>
              {address_street && address_zip && address_city && (
                <p className="text-sm text-gray-600">
                  {address_street}, {address_zip} {address_city}
                </p>
              )}
            </div>

            {/* Barakah Section */}
            {zakatProjects.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Unser Barakah Effekt:</h3>
                <div className="relative h-48 w-full overflow-hidden rounded-xl">
                  <img
                    alt={zakatProjects[0].zakat_name}
                    className="h-full w-full object-cover"
                    src={
                      zakatProjects[0].zakat_images && zakatProjects[0].zakat_images.length > 0
                        ? zakatProjects[0].zakat_images[0]
                        : '/images/placeholder.jpg'
                    }
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="font-medium text-white">{zakatProjects[0].zakat_name}</span>
                  </div>
                </div>
                {barakah_effects && barakah_effects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {barakah_effects.map((effect, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                      >
                        {effect}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="mb-4">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Beschreibung:</h3>
                <p className="leading-relaxed text-gray-700">{description}</p>
              </div>
            )}

            {/* Opening Hours */}
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Öffnungszeiten:</h3>
              <div className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-700">Mo - Fr:</span>
                <span className="font-medium text-gray-900">Fajr bis Isha</span>
              </div>
            </div>
          </div>

          {/* Action Bar - Revolut Style */}
          <div className="border-t border-gray-100 bg-white px-4 py-4">
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
