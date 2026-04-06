'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';
import { validateAndSanitizeName } from '@/utils/sanitizeInput';

/**
 * Offers selection sub-page for community service edit.
 *
 * Adapts the provider edit offers sub-page (Plan 083 — M3):
 *  - Queries community_services table (not providers)
 *  - Uses community_service_id column (not provider_id)
 *  - Uses admin_cs_edit_offers_${id} localStorage key (not admin_edit_offers_${id})
 */
export default function CsEditOffersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityServiceId } = use(params);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [csCategoryId, setCsCategoryId] = useState<string | null>(null);
  const [newOffer, setNewOffer] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { t, language } = useLanguage();

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

  useEffect(() => {
    const loadCurrentOffers = async () => {
      try {
        // CS-specific localStorage key
        const stored = localStorage.getItem(`admin_cs_edit_offers_${communityServiceId}`);
        if (stored) {
          setSelectedOfferIds(JSON.parse(stored));
          return;
        }

        // CS-specific table and ID column
        const { data, error } = await supabase
          .from('community_services')
          .select('offers_ids, category_id')
          .eq('community_service_id', communityServiceId)
          .single();

        if (!error && data) {
          if (data.offers_ids) {
            setSelectedOfferIds(data.offers_ids);
          }
          if (data.category_id) {
            setCsCategoryId(data.category_id);
          }
        }
      } catch (error) {
        console.error('Error loading current offers:', error);
      }
    };

    void loadCurrentOffers();
  }, [communityServiceId]);

  const filteredOffers = offers.filter((offer) => {
    const offerName = language === 'en' ? (offer.name_en || offer.name_de || '') : (offer.name_de || offer.name_en || '');
    return offerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleOffer = (offerId: string) => {
    setSelectedOfferIds(prev => {
      const newSelection = prev.includes(offerId)
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId];

      localStorage.setItem(`admin_cs_edit_offers_${communityServiceId}`, JSON.stringify(newSelection));
      return newSelection;
    });
  };

  const createOffer = async () => {
    const sanitizedName = validateAndSanitizeName(newOffer.trim(), 100);
    if (!sanitizedName) {
      toast.error('Error creating offer');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sanitizedName, categoryId: csCategoryId }),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(responseData.error || 'Error creating offer');
        return;
      }

      const createdOffer = responseData.data as Offer;
      setOffers(prev => [...prev, createdOffer]);
      const newSelection = [...selectedOfferIds, createdOffer.offer_id];
      setSelectedOfferIds(newSelection);
      localStorage.setItem(`admin_cs_edit_offers_${communityServiceId}`, JSON.stringify(newSelection));
      setNewOffer('');
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Error creating offer');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <div className="flex h-screen-fix flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label={t('editProvider.back')}
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-heading">{t('editProvider.editOffers.title')}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+24px)] pb-24">
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('editProvider.editOffers.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
              {t('editProvider.editOffers.description')}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-[#232323]">{t('editProvider.editOffers.createNew')}</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder={t('editProvider.editOffers.offerPlaceholder')}
                type="text"
                value={newOffer}
                onChange={(e) => setNewOffer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createOffer()}
              />
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark active:bg-primary-darker disabled:opacity-50"
                disabled={!newOffer.trim() || isCreating}
                onClick={createOffer}
              >
                {isCreating ? '...' : t('editProvider.editOffers.add')}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">{t('editProvider.editOffers.availableOffers')}</h3>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('editProvider.editOffers.loading')}</span>
              </div>
            ) : (
              filteredOffers.map((offer) => (
                <button
                  key={offer.offer_id}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                    selectedOfferIds.includes(offer.offer_id)
                      ? 'bg-primary-light text-content-heading border border-primary'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => toggleOffer(offer.offer_id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {language === 'en' ? (offer.name_en || offer.name_de || '') : (offer.name_de || offer.name_en || '')}
                    </span>
                    {selectedOfferIds.includes(offer.offer_id) && (
                      <Icon className="h-5 w-5 text-primary" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      <FooterAction
        actionButton={{
          label: selectedOfferIds.length > 0 ? t('editProvider.editOffers.selected').replace('{{count}}', selectedOfferIds.length.toString()) : t('editProvider.editOffers.selectOffers'),
          icon: 'lucide:check',
          onClick: handleSave,
          variant: 'primary',
          disabled: selectedOfferIds.length === 0,
          'aria-label': t('editProvider.editOffers.saveAria'),
        }}
      />
    </div>
  );
}
