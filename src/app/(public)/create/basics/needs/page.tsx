'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';
import type { Category } from '@/types/supabase';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { getSuggestedNeedsForCategory, type SuggestedNeed } from '@/services/category-suggestions';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { validateOfferOrNeedName, findSimilarItems, calculateSimilarity } from '@/utils/contentValidation';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

export default function SelectNeedsPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [suggestedNeeds, setSuggestedNeeds] = useState<SuggestedNeed[]>([]);
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

  // Load needs from database
  useEffect(() => {
    async function fetchNeeds() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('needs')
          .select('need_id, name_de, name_en, created_at, updated_at, created_by')
          .order('name_de', { ascending: true });
        
        if (error) {
          console.error('Error fetching needs:', error);
        } else if (data) {
          setNeeds(data);
        }
      } catch (error) {
        console.error('Error fetching needs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchNeeds();
  }, []);

  // Load suggested needs when category changes
  useEffect(() => {
    async function fetchSuggestedNeeds() {
      if (!formData.category) {
        setSuggestedNeeds([]);
        return;
      }

      try {
        const suggestions = await getSuggestedNeedsForCategory(formData.category);
        setSuggestedNeeds(suggestions);
      } catch (error) {
        console.error('Error fetching suggested needs:', error);
        setSuggestedNeeds([]);
      }
    }

    void fetchSuggestedNeeds();
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

  // Get suggested need IDs for filtering
  const suggestedNeedIds = new Set(suggestedNeeds.map(n => n.need_id));
  
  // Get selected needs
  const selectedNeeds = needs.filter(need => 
    formData.needs_ids.includes(need.need_id)
  );
  
  // Split needs into suggested and other (excluding selected)
  const availableSuggestedNeeds = suggestedNeeds.filter(need =>
    !formData.needs_ids.includes(need.need_id)
  );
  const otherNeeds = needs.filter(need => 
    !suggestedNeedIds.has(need.need_id) && !formData.needs_ids.includes(need.need_id)
  );
  
  // Filter all lists based on search query
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredSelectedNeeds = selectedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );
  const filteredSuggestedNeeds = availableSuggestedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );
  const filteredOtherNeeds = otherNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );

  // Check if search query exactly matches any need
  const hasExactMatch = needs.some(need => 
    need.name_de.toLowerCase() === searchLower
  );

  // Find similar items to show as warnings (only medium similarity, not very similar ones that get auto-selected)
  // Very similar items (>=85% similar) will be auto-selected, so we exclude them from the warning box
  const similarNeeds = searchQuery.trim() && !hasExactMatch
    ? findSimilarItems(searchQuery.trim(), needs, 0.4, 3).filter(need => {
        // Calculate similarity to exclude very similar items (>=85% similar) that get auto-selected
        const similarity = calculateSimilarity(searchQuery.trim(), need.name_de);
        // Only show items with medium similarity (40-85%), not very similar ones
        return similarity > 0.15 && similarity <= 0.85;
      })
    : [];

  // Show "Create new" option if there's a search query with no exact match
  const showCreateOption = searchQuery.trim() && !hasExactMatch;

  // Get selected category name for display
  const selectedCategory = categories.find(cat => cat.category_id === formData.category);

  // Toggle need selection (multi-selection)
  const toggleNeed = (needId: string) => {
    const newNeeds = formData.needs_ids.includes(needId)
      ? formData.needs_ids.filter(id => id !== needId)
      : [...formData.needs_ids, needId];
    updateFormData({ needs_ids: newNeeds });
  };

  // Create new need from search query
  const createNeedFromSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    // Validate the input
    const validation = validateOfferOrNeedName(searchQuery.trim(), needs, true);
    
    // If there's a very similar item, auto-select it instead of creating
    if (validation.shouldAutoSelect) {
      const similarName = validation.shouldAutoSelect.item.name_de;
      const existingNeed = needs.find(
        n => n.name_de === similarName
      );
      if (existingNeed) {
        // Auto-select the existing need
        if (!formData.needs_ids.includes(existingNeed.need_id)) {
          updateFormData({ needs_ids: [...formData.needs_ids, existingNeed.need_id] });
        }
        setSearchQuery('');
        toast.info(`"${existingNeed.name_de}" wurde automatisch ausgewählt`, {
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
          const mostSimilar = needs.find(
            n => n.name_de === firstSimilar.name_de
          );
          if (mostSimilar && !formData.needs_ids.includes(mostSimilar.need_id)) {
            updateFormData({ needs_ids: [...formData.needs_ids, mostSimilar.need_id] });
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
        .from('needs')
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
          console.error('Error creating need:', error);
          toast.error('Fehler beim Erstellen des Gesuchs');
        }
      } else if (data) {
        // Add to local state
        setNeeds(prev => [...prev, data]);
        // Auto-select the new need
        updateFormData({ needs_ids: [...formData.needs_ids, data.need_id] });
        // Clear search
        setSearchQuery('');
        toast.success(`"${data.name_de}" wurde hinzugefügt`);
      }
    } catch (error) {
      console.error('Error creating need:', error);
      toast.error('Fehler beim Erstellen des Gesuchs');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a need (only if user created it and it's not used)
  const deleteNeed = async (needId: string, needName: string) => {
    if (!user) return;
    
    setDeletingId(needId);
    try {
      const { error } = await supabase
        .from('needs')
        .delete()
        .eq('need_id', needId)
        .eq('created_by', user.id);
      
      if (error) {
        console.error('Error deleting need:', error);
        toast.error('Gesuch kann nicht gelöscht werden (möglicherweise bereits verwendet)');
      } else {
        // Remove from local state
        setNeeds(prev => prev.filter(n => n.need_id !== needId));
        // Remove from selected if it was selected
        updateFormData({ 
          needs_ids: formData.needs_ids.filter(id => id !== needId) 
        });
        toast.success(`"${needName}" wurde gelöscht`);
      }
    } catch (error) {
      console.error('Error deleting need:', error);
      toast.error('Fehler beim Löschen des Gesuchs');
    } finally {
      setDeletingId(null);
    }
  };

  // Save selected needs and return to create page
  const handleSave = () => {
    if (formData.needs_ids.length > 0) {
      router.push('/create/basics');
    }
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      {/* Reusable Header */}
      <PageHeader
        isVisible={isHeaderSticky}
        title="Gesuche auswählen"
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
                  placeholder="Gesuche suchen oder neu erstellen..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && showCreateOption && !isCreating) {
                      createNeedFromSearch();
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
                Suche nach Gesuchen oder erstelle neue - inshaAllah.
              </p>
            </div>
          </div>

          {/* Needs List */}
          <div className="flex-1 w-full pb-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">Lade Gesuche...</span>
              </div>
            ) : (
              <>
                {/* Selected Needs Section */}
                {filteredSelectedNeeds.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-[#589D96] bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        Ausgewählt ({filteredSelectedNeeds.length})
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
                        {filteredSelectedNeeds.map((need) => (
                          <div key={need.need_id} className="relative">
                            <button
                              className="inline-flex rounded-xl px-4 py-2 pr-3 text-left transition-all duration-200 bg-[#BFDBD8] text-[#232323] border border-[#589D96]"
                              onClick={() => toggleNeed(need.need_id)}
                            >
                              <span className="text-sm font-medium">
                                {need.name_de}
                              </span>
                            </button>
                            {/* Delete button for user-created needs - always visible */}
                            {('created_by' in need && (need as { created_by?: string }).created_by === user?.id) && (
                              <button
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                disabled={deletingId === need.need_id}
                                title="Löschen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNeed(need.need_id, need.name_de);
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

                {/* Similar Needs Warning */}
                {showCreateOption && similarNeeds.length > 0 && (
                  <div className="mb-4 rounded-lg border border-yellow-400 bg-yellow-50 p-3">
                    <div className="mb-2 flex items-start gap-2">
                      <Icon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" icon="lucide:alert-triangle" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Ähnliche Einträge gefunden:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {similarNeeds.map((need) => (
                            <button
                              key={need.need_id}
                              className="text-xs px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors border border-yellow-300"
                              onClick={() => {
                                toggleNeed(need.need_id);
                                setSearchQuery('');
                              }}
                            >
                              {need.name_de}
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
                      onClick={createNeedFromSearch}
                    >
                      <Icon className="h-4 w-4" icon="lucide:plus" />
                      <span className="text-sm font-medium">
                        {isCreating ? 'Erstelle...' : `"${searchQuery}" hinzufügen`}
                      </span>
                    </button>
                  </div>
                )}

                {/* Suggested Needs (based on category) */}
                {filteredSuggestedNeeds.length > 0 && (
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
                        {filteredSuggestedNeeds.map((need) => (
                          <button
                            key={need.need_id}
                            className="inline-flex rounded-xl px-4 py-2 text-left transition-all duration-200 bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            onClick={() => toggleNeed(need.need_id)}
                          >
                            <span className="text-sm font-medium">
                              {need.name_de}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All Other Needs */}
                {filteredOtherNeeds.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {filteredSuggestedNeeds.length > 0 ? 'Weitere Gesuche' : 'Verfügbare Gesuche'} ({filteredOtherNeeds.length})
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
                        {filteredOtherNeeds.map((need) => (
                          <button
                            key={need.need_id}
                            className="inline-flex rounded-xl px-4 py-2 text-left transition-all duration-200 bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            onClick={() => toggleNeed(need.need_id)}
                          >
                            <span className="text-sm font-medium">
                              {need.name_de}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No results message */}
                {!showCreateOption && filteredSelectedNeeds.length === 0 && filteredSuggestedNeeds.length === 0 && filteredOtherNeeds.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Icon className="h-12 w-12 text-gray-300" icon="lucide:search-x" />
                    <span className="text-gray-500">Keine Gesuche gefunden</span>
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
              formData.needs_ids.length === 0
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed'
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={formData.needs_ids.length === 0}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              {t('actions.save')} ({formData.needs_ids.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
