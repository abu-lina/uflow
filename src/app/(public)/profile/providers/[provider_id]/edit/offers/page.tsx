'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';

export default function EditOffersPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [newOffer, setNewOffer] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

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

  // Load current selections
  useEffect(() => {
    const loadCurrentOffers = async () => {
      try {
        // First check localStorage for any pending selection
        const stored = localStorage.getItem(`edit_offers_${resolvedParams.provider_id}`);
        if (stored) {
          setSelectedOfferIds(JSON.parse(stored));
          return;
        }

        // If no localStorage value, fetch current provider offers
        const { data, error } = await supabase
          .from('providers')
          .select('offers_ids')
          .eq('provider_id', resolvedParams.provider_id)
          .single();

        if (!error && data?.offers_ids) {
          setSelectedOfferIds(data.offers_ids);
        }
      } catch (error) {
        console.error('Error loading current offers:', error);
      }
    };

    void loadCurrentOffers();
  }, [resolvedParams.provider_id]);

  const filteredOffers = offers.filter((offer) =>
    offer.name_de?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOffer = (offerId: string) => {
    setSelectedOfferIds(prev => {
      const newSelection = prev.includes(offerId)
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId];
      
      localStorage.setItem(`edit_offers_${resolvedParams.provider_id}`, JSON.stringify(newSelection));
      return newSelection;
    });
  };

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
        const newSelection = [...selectedOfferIds, data.offer_id];
        setSelectedOfferIds(newSelection);
        localStorage.setItem(`edit_offers_${resolvedParams.provider_id}`, JSON.stringify(newSelection));
        setNewOffer('');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-title">Was biete ich?</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+16px)] pb-24">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-[#589D96] focus:outline-none focus:ring-1 focus:ring-[#589D96]"
                placeholder="Angebote durchsuchen..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-4">
            <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
              Wähle deine Angebote aus oder erstelle neue, um passende Gesuche zu erhalten - inshaAllah.
            </p>
          </div>

          {/* Create New Offer */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-[#232323]">Neues Angebot erstellen</h3>
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
          <div className="mb-4">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">Verfügbare Angebote</h3>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">Lade Angebote...</span>
              </div>
            ) : (
              filteredOffers.map((offer) => (
                <button
                  key={offer.offer_id}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                    selectedOfferIds.includes(offer.offer_id)
                      ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => toggleOffer(offer.offer_id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{offer.name_de}</span>
                    {selectedOfferIds.includes(offer.offer_id) && (
                      <Icon className="h-5 w-5 text-[#589D96]" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
        <div className="flex w-full gap-3.5 max-w-[393px] mx-auto">
          <button
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#589D96] text-base font-medium text-white shadow transition hover:bg-[#4a8a84] disabled:opacity-30"
            disabled={selectedOfferIds.length === 0}
            onClick={handleSave}
          >
            <Icon className="h-5 w-5" icon="lucide:check" />
            {selectedOfferIds.length > 0 ? `${selectedOfferIds.length} ausgewählt` : 'Angebote auswählen'}
          </button>
        </div>
      </div>
    </div>
  );
}
