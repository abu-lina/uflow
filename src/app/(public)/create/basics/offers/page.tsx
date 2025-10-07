'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';
import { useFormData } from '@/providers/form-provider';

export default function SelectOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newOffer, setNewOffer] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();

  // Load offers from database
  useEffect(() => {
    async function fetchOffers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .order('name_de', { ascending: true });
        
        if (error) {
          console.error('Error fetching offers:', error);
        } else if (data) {
          setOffers(data);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchOffers();
  }, []);


  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  // Filter offers based on search query
  const filteredOffers = offers.filter(offer =>
    offer.name_de.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle offer selection (multi-selection)
  const toggleOffer = (offerId: string) => {
    const newOffers = formData.offers_ids.includes(offerId)
      ? formData.offers_ids.filter(id => id !== offerId)
      : [...formData.offers_ids, offerId];
    updateFormData({ offers_ids: newOffers });
  };

  // Create new offer
  const createOffer = async () => {
    if (!newOffer.trim()) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([{ name_de: newOffer.trim() }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating offer:', error);
      } else if (data) {
        setOffers(prev => [...prev, data]);
        updateFormData({ offers_ids: [...formData.offers_ids, data.offer_id] });
        setNewOffer('');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Save selected offers and return to create page
  const handleSave = () => {
    if (formData.offers_ids.length > 0) {
      router.push('/create/basics');
    }
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-all duration-300 ease-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.push('/create/basics')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              Angebote auswählen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-mobile-nav-md">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-2xl bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-3">
                <Icon className="size-6 shrink-0 text-[#1B1D1D]" icon="lucide:search" />
                <input
                  className="text-xs font-normal text-[#7C7C7C] leading-[15px] outline-none placeholder:text-[#7C7C7C] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent pl-0"
                  placeholder="Angebote durchsuchen"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="w-full">
              <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
                Wähle deine Angebote aus oder erstelle neue, um passende Gesuche zu erhalten - inshaAllah.
              </p>
            </div>
          </div>

          {/* Create New Offer */}
          <div className="flex w-full flex-col gap-2">
            <h3 className="text-sm font-medium text-[#232323]">Neues Angebot erstellen</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#589D96] focus:outline-none"
                placeholder="Angebot eingeben..."
                type="text"
                value={newOffer}
                onChange={(e) => setNewOffer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createOffer()}
              />
              <button
                className="rounded-lg bg-[#589D96] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!newOffer.trim() || isCreating}
                onClick={createOffer}
              >
                {isCreating ? '...' : 'Hinzufügen'}
              </button>
            </div>
          </div>

          {/* Offers List */}
          <div className="flex-1 w-full">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">Verfügbare Angebote</h3>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <span className="text-gray-500">Lade Angebote...</span>
                </div>
              ) : (
                filteredOffers.map((offer) => (
                  <button
                    key={offer.offer_id}
                    className={`inline-flex rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                      formData.offers_ids.includes(offer.offer_id)
                        ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                        : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => toggleOffer(offer.offer_id)}
                  >
                    <span className="text-sm font-medium">
                      {offer.name_de}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              formData.offers_ids.length === 0
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed'
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={formData.offers_ids.length === 0}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              Speichern ({formData.offers_ids.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
