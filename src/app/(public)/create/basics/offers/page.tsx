'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';
import type { Category } from '@/types/supabase';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { getSuggestedOffersForCategory, type SuggestedOffer } from '@/services/category-suggestions';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { validateOfferOrNeedName, findSimilarItems, calculateSimilarity } from '@/utils/contentValidation';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

export default function SelectOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suggestedOffers, setSuggestedOffers] = useState<SuggestedOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  // Collapsible section states
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(true);
  const [isSuggestedExpanded, setIsSuggestedExpanded] = useState(true);
  const [isOtherExpanded, setIsOtherExpanded] = useState(true);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Load categories from database
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name_de', { ascending: true });
        
        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    
    void fetchCategories();
  }, []);

  // Load offers from database
  useEffect(() => {
    async function fetchOffers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('offer_id, name_de, name_en, created_at, updated_at, created_by')
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

  // Load suggested offers when category changes
  useEffect(() => {
    async function fetchSuggestedOffers() {
      if (!formData.category) {
        setSuggestedOffers([]);
        return;
      }

      try {
        const suggestions = await getSuggestedOffersForCategory(formData.category);
        setSuggestedOffers(suggestions);
      } catch (error) {
        console.error('Error fetching suggested offers:', error);
        setSuggestedOffers([]);
      }
    }

    void fetchSuggestedOffers();
  }, [formData.category]);


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

  // Get suggested offer IDs for filtering
  const suggestedOfferIds = new Set(suggestedOffers.map(o => o.offer_id));
  
  // Get selected offers
  const selectedOffers = offers.filter(offer => 
    formData.offers_ids.includes(offer.offer_id)
  );
  
  // Split offers into suggested and other (excluding selected)
  const availableSuggestedOffers = suggestedOffers.filter(offer =>
    !formData.offers_ids.includes(offer.offer_id)
  );
  const otherOffers = offers.filter(offer => 
    !suggestedOfferIds.has(offer.offer_id) && !formData.offers_ids.includes(offer.offer_id)
  );
  
  // Filter all lists based on search query
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredSelectedOffers = selectedOffers.filter(offer =>
    offer.name_de.toLowerCase().includes(searchLower)
  );
  const filteredSuggestedOffers = availableSuggestedOffers.filter(offer =>
    offer.name_de.toLowerCase().includes(searchLower)
  );
  const filteredOtherOffers = otherOffers.filter(offer =>
    offer.name_de.toLowerCase().includes(searchLower)
  );

  // Check if search query exactly matches any offer
  const hasExactMatch = offers.some(offer => 
    offer.name_de.toLowerCase() === searchLower
  );

  // Find similar items to show as warnings (only medium similarity, not very similar ones that get auto-selected)
  // Very similar items (>=85% similar) will be auto-selected, so we exclude them from the warning box
  const similarOffers = searchQuery.trim() && !hasExactMatch
    ? findSimilarItems(searchQuery.trim(), offers, 0.4, 3).filter(offer => {
        // Calculate similarity to exclude very similar items (>=85% similar) that get auto-selected
        const similarity = calculateSimilarity(searchQuery.trim(), offer.name_de);
        // Only show items with medium similarity (40-85%), not very similar ones
        return similarity > 0.15 && similarity <= 0.85;
      })
    : [];

  // Show "Create new" option if there's a search query with no exact match
  const showCreateOption = searchQuery.trim() && !hasExactMatch;

  // Get selected category name for display
  const selectedCategory = categories.find(cat => cat.category_id === formData.category);

  // Toggle offer selection (multi-selection)
  const toggleOffer = (offerId: string) => {
    const newOffers = formData.offers_ids.includes(offerId)
      ? formData.offers_ids.filter(id => id !== offerId)
      : [...formData.offers_ids, offerId];
    updateFormData({ offers_ids: newOffers });
  };

  // Create new offer from search query
  const createOfferFromSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    // Validate the input
    const validation = validateOfferOrNeedName(searchQuery.trim(), offers, true);
    
    // If there's a very similar item, auto-select it instead of creating
    if (validation.shouldAutoSelect) {
      const similarName = validation.shouldAutoSelect.item.name_de;
      const existingOffer = offers.find(
        o => o.name_de === similarName
      );
      if (existingOffer) {
        // Auto-select the existing offer
        if (!formData.offers_ids.includes(existingOffer.offer_id)) {
          updateFormData({ offers_ids: [...formData.offers_ids, existingOffer.offer_id] });
        }
        setSearchQuery('');
        toast.info(`"${existingOffer.name_de}" wurde automatisch ausgewählt`, {
          description: 'Ein sehr ähnlicher Eintrag wurde gefunden und verwendet.',
          duration: 4000,
        });
        return;
      }
    }
    
    // Show errors and abort if invalid
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    // Show warnings about similar items (non-blocking, but ask for confirmation)
    if (validation.warnings.length > 0 && validation.similarItems && validation.similarItems.length > 0) {
      const similarNames = validation.similarItems.map(s => s.name_de).join(', ');
      const confirmed = window.confirm(
        `Ähnliche Einträge gefunden: ${similarNames}\n\nMöchten Sie trotzdem "${searchQuery.trim()}" erstellen?`
      );
      if (!confirmed) {
        // If user declines, offer to select the most similar item
        const firstSimilar = validation.similarItems?.[0];
        if (firstSimilar) {
          const mostSimilar = offers.find(
            o => o.name_de === firstSimilar.name_de
          );
          if (mostSimilar && !formData.offers_ids.includes(mostSimilar.offer_id)) {
            updateFormData({ offers_ids: [...formData.offers_ids, mostSimilar.offer_id] });
            toast.info(`"${mostSimilar.name_de}" wurde ausgewählt`);
          }
        }
        setSearchQuery('');
        return;
      }
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([{ 
          name_de: searchQuery.trim(),
          created_by: user.id 
        }])
        .select()
        .single();
      
      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505' || error.message.includes('unique')) {
          toast.error('Ein Eintrag mit diesem Namen existiert bereits');
        } else {
          console.error('Error creating offer:', error);
          toast.error('Fehler beim Erstellen des Angebots');
        }
      } else if (data) {
        // Add to local state
        setOffers(prev => [...prev, data]);
        // Auto-select the new offer
        updateFormData({ offers_ids: [...formData.offers_ids, data.offer_id] });
        // Clear search
        setSearchQuery('');
        toast.success(`"${data.name_de}" wurde hinzugefügt`);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Fehler beim Erstellen des Angebots');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete an offer (only if user created it and it's not used)
  const deleteOffer = async (offerId: string, offerName: string) => {
    if (!user) return;
    
    setDeletingId(offerId);
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('offer_id', offerId)
        .eq('created_by', user.id);
      
      if (error) {
        console.error('Error deleting offer:', error);
        toast.error('Angebot kann nicht gelöscht werden (möglicherweise bereits verwendet)');
      } else {
        // Remove from local state
        setOffers(prev => prev.filter(o => o.offer_id !== offerId));
        // Remove from selected if it was selected
        updateFormData({ 
          offers_ids: formData.offers_ids.filter(id => id !== offerId) 
        });
        toast.success(`"${offerName}" wurde gelöscht`);
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Fehler beim Löschen des Angebots');
    } finally {
      setDeletingId(null);
    }
  };

  // Save selected offers and return to create page
  const handleSave = () => {
    if (formData.offers_ids.length > 0) {
      router.push('/create/basics');
    }
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      {/* Reusable Header */}
      <PageHeader
        isVisible={isHeaderSticky}
        title="Angebote auswählen"
        variant="back-and-title"
        onBack="/create/basics"
      />
      <HeaderSpacer isVisible={isHeaderSticky} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-2xl bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-3 flex-1">
                <Icon className="size-6 shrink-0 text-[#1B1D1D]" icon="lucide:search" />
                <input
                  className="flex-1 text-xs font-normal text-[#7C7C7C] leading-[15px] outline-none placeholder:text-[#7C7C7C] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent pl-0"
                  placeholder="Angebote suchen oder neu erstellen..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && showCreateOption && !isCreating) {
                      createOfferFromSearch();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    className="text-[#7C7C7C] hover:text-[#1B1D1D]"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon className="size-5" icon="lucide:x" />
                  </button>
                )}
              </div>
            </div>

            {/* Subtitle */}
            <div className="w-full">
              <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
                Suche nach Angeboten oder erstelle neue - inshaAllah.
              </p>
            </div>
          </div>

          {/* Offers List */}
          <div className="flex-1 w-full pb-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">Lade Angebote...</span>
              </div>
            ) : (
              <>
                {/* Selected Offers Section */}
                {filteredSelectedOffers.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-[#589D96] bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        Ausgewählt ({filteredSelectedOffers.length})
                      </h3>
                      <Icon 
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                          isSelectedExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                        icon="lucide:chevron-down" 
                      />
                    </button>
                    {isSelectedExpanded && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
                        {filteredSelectedOffers.map((offer) => (
                          <div key={offer.offer_id} className="relative">
                            <button
                              className="inline-flex rounded-xl px-4 py-2 pr-3 text-left transition-all duration-200 bg-[#BFDBD8] text-[#232323] border border-[#589D96]"
                              onClick={() => toggleOffer(offer.offer_id)}
                            >
                              <span className="text-sm font-medium">
                                {offer.name_de}
                              </span>
                            </button>
                            {/* Delete button for user-created offers - always visible */}
                            {('created_by' in offer && (offer as { created_by?: string }).created_by === user?.id) && (
                              <button
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                disabled={deletingId === offer.offer_id}
                                title="Löschen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteOffer(offer.offer_id, offer.name_de);
                                }}
                              >
                                <Icon className="h-3 w-3" icon="lucide:x" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Similar Offers Warning */}
                {showCreateOption && similarOffers.length > 0 && (
                  <div className="mb-4 rounded-lg border border-yellow-400 bg-yellow-50 p-3">
                    <div className="mb-2 flex items-start gap-2">
                      <Icon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" icon="lucide:alert-triangle" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Ähnliche Einträge gefunden:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {similarOffers.map((offer) => (
                            <button
                              key={offer.offer_id}
                              className="text-xs px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors border border-yellow-300"
                              onClick={() => {
                                toggleOffer(offer.offer_id);
                                setSearchQuery('');
                              }}
                            >
                              {offer.name_de}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create New Option (when search has no exact match) */}
                {showCreateOption && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-medium text-[#232323]">Neu erstellen</h3>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[#589D96] text-white border border-[#589D96] hover:bg-[#4a8780] transition-all duration-200 disabled:opacity-50"
                      disabled={isCreating}
                      onClick={createOfferFromSearch}
                    >
                      <Icon className="h-4 w-4" icon="lucide:plus" />
                      <span className="text-sm font-medium">
                        {isCreating ? 'Erstelle...' : `"${searchQuery}" hinzufügen`}
                      </span>
                    </button>
                  </div>
                )}

                {/* Suggested Offers (based on category) */}
                {filteredSuggestedOffers.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSuggestedExpanded(!isSuggestedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        Empfohlen für {selectedCategory?.name_de}
                      </h3>
                      <Icon 
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                          isSuggestedExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                        icon="lucide:chevron-down" 
                      />
                    </button>
                    {isSuggestedExpanded && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
                        {filteredSuggestedOffers.map((offer) => (
                          <button
                            key={offer.offer_id}
                            className="inline-flex rounded-xl px-4 py-2 text-left transition-all duration-200 bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            onClick={() => toggleOffer(offer.offer_id)}
                          >
                            <span className="text-sm font-medium">
                              {offer.name_de}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All Other Offers */}
                {filteredOtherOffers.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {filteredSuggestedOffers.length > 0 ? 'Weitere Angebote' : 'Verfügbare Angebote'} ({filteredOtherOffers.length})
                      </h3>
                      <Icon 
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                          isOtherExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                        icon="lucide:chevron-down" 
                      />
                    </button>
                    {isOtherExpanded && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
                        {filteredOtherOffers.map((offer) => (
                          <button
                            key={offer.offer_id}
                            className="inline-flex rounded-xl px-4 py-2 text-left transition-all duration-200 bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            onClick={() => toggleOffer(offer.offer_id)}
                          >
                            <span className="text-sm font-medium">
                              {offer.name_de}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No results message */}
                {!showCreateOption && filteredSelectedOffers.length === 0 && filteredSuggestedOffers.length === 0 && filteredOtherOffers.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Icon className="h-12 w-12 text-gray-300" icon="lucide:search-x" />
                    <span className="text-gray-500">Keine Angebote gefunden</span>
                    {searchQuery && (
                      <p className="text-sm text-gray-400">
                        Drücke Enter um &quot;{searchQuery}&quot; hinzuzufügen
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
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
              {t('actions.save')} ({formData.offers_ids.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
