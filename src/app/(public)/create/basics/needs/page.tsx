'use client';

import { useEffect, useState } from 'react';
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
import { validateOfferOrNeedName, findSimilarItems, calculateSimilarity, normalizeText, areSynonyms } from '@/utils/contentValidation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export default function SelectNeedsPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [suggestedNeeds, setSuggestedNeeds] = useState<SuggestedNeed[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Collapsible section states
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(true);
  const [isSuggestedExpanded, setIsSuggestedExpanded] = useState(true);
  const [isOtherExpanded, setIsOtherExpanded] = useState(true);
  const [isUnrelatedExpanded, setIsUnrelatedExpanded] = useState(true);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

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

  // Load needs from database - fetch all needs, then sort by relevance
  useEffect(() => {
    async function fetchNeeds() {
      setIsLoading(true);
      try {
        // Fetch all needs (even if no category is selected, show all needs)
        const { data, error } = await supabase
          .from('needs')
          .select('need_id, name_de, name_en, created_at, updated_at, created_by, category_id')
          .order('name_de', { ascending: true });
        
        if (error) {
          console.error('Error fetching needs:', error);
          toast.error(t('create.needs.errorLoading') || 'Error loading needs. Please try again.');
          setNeeds([]);
        } else if (data) {
          // Sort needs: category-related first (if category is selected), then unrelated
          // Within each group, maintain alphabetical order
          const sortedNeeds = formData.category
            ? [...data].sort((a, b) => {
                const aIsRelated = a.category_id === formData.category;
                const bIsRelated = b.category_id === formData.category;
                
                // If one is related and the other isn't, related comes first
                if (aIsRelated && !bIsRelated) return -1;
                if (!aIsRelated && bIsRelated) return 1;
                
                // If both are in the same group, sort alphabetically
                return a.name_de.localeCompare(b.name_de);
              })
            : data; // If no category, just use alphabetical order
          
          setNeeds(sortedNeeds);
        } else {
          setNeeds([]);
        }
      } catch (error) {
        console.error('Error fetching needs:', error);
        toast.error(t('create.needs.errorLoading') || 'Error loading needs. Please try again.');
        setNeeds([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchNeeds();
  }, [formData.category, t]);

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
  
  // Split other needs into category-related and unrelated
  const otherNeeds = needs.filter(need => 
    !suggestedNeedIds.has(need.need_id) 
    && !formData.needs_ids.includes(need.need_id)
  );
  
  // Category-related other needs (matching category but not in suggested list)
  const categoryRelatedNeeds = otherNeeds.filter(need =>
    need.category_id === formData.category
  );
  
  // Unrelated needs (from other categories or uncategorized)
  const unrelatedNeeds = otherNeeds.filter(need =>
    need.category_id !== formData.category
  );
  
  // Filter all lists based on search query
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredSelectedNeeds = selectedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );
  const filteredSuggestedNeeds = availableSuggestedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );
  const filteredCategoryRelatedNeeds = categoryRelatedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );
  const filteredUnrelatedNeeds = unrelatedNeeds.filter(need =>
    need.name_de.toLowerCase().includes(searchLower)
  );

  // Get all category-filtered needs (for search and similarity checks)
  // This includes selected, suggested, and other needs that match the category
  const categoryFilteredNeeds = needs.filter(need => 
    formData.category ? need.category_id === formData.category : true
  );

  // Check if search query exactly matches any need (only within category-filtered needs)
  const hasExactMatch = categoryFilteredNeeds.some(need => 
    need.name_de.toLowerCase() === searchLower
  );

  // Find similar items to show as warnings (only medium similarity, not very similar ones that get auto-selected)
  // Very similar items (<=15% similarity = synonyms/typos) will be auto-selected
  // High similarity (15-85%) will also be auto-selected to prevent duplicates
  // Only show items with medium similarity (85%+ different) as warnings
  // Also filter out synonyms of each other to avoid showing duplicate suggestions
  const similarNeeds = searchQuery.trim() && !hasExactMatch
    ? (() => {
        const allSimilar = findSimilarItems(searchQuery.trim(), categoryFilteredNeeds, 0.4, 10);
        const filtered = allSimilar.filter(need => {
          // Calculate similarity to exclude very/high similarity items that get auto-selected
          const similarity = calculateSimilarity(searchQuery.trim(), need.name_de);
          // Only show items with medium similarity (>85% different), not very similar ones
          return similarity > 0.85;
        });
        
        // Remove synonyms from the list to avoid showing duplicate suggestions
        const uniqueSimilar: typeof filtered = [];
        const seen = new Set<string>();
        
        for (const need of filtered) {
          const normalizedName = normalizeText(need.name_de);
          // Skip if we've already seen a synonym of this item
          let isSynonym = false;
          for (const seenName of Array.from(seen)) {
            if (areSynonyms(need.name_de, seenName)) {
              isSynonym = true;
              break;
            }
          }
          if (!isSynonym && uniqueSimilar.length < 3) {
            uniqueSimilar.push(need);
            seen.add(normalizedName);
          }
        }
        
        return uniqueSimilar;
      })()
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
    // In recommendation mode, allow anonymous users (skip auth check)
    const isRecommendationMode = formData.creationMode === 'recommendation';
    
    if (!searchQuery.trim()) return;
    if (!user && !isRecommendationMode) {
      toast.error(t('create.needs.mustBeLoggedIn') || 'You must be logged in to create a need');
      return;
    }
    
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
        toast.info(
          t('create.needs.autoSelected').replace('{{name}}', existingNeed.name_de),
          {
            description: t('create.needs.autoSelectedDescription'),
            duration: 4000,
          }
        );
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
        t('create.needs.similarEntriesDialog')
          .replace('{{similarNames}}', similarNames)
          .replace('{{query}}', searchQuery.trim())
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
            toast.info(t('create.needs.wasSelected').replace('{{name}}', mostSimilar.name_de));
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
          created_by: user?.id || null, // Allow null for anonymous users in recommendation mode
          category_id: formData.category || null
        }])
        .select()
        .single();
      
      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505' || error.message.includes('unique')) {
          toast.error(t('create.needs.entryExists'));
        } else {
          console.error('Error creating need:', error);
          toast.error(t('create.needs.errorCreating'));
        }
      } else if (data) {
        // Add to local state
        setNeeds(prev => [...prev, data]);
        // Auto-select the new need
        updateFormData({ needs_ids: [...formData.needs_ids, data.need_id] });
        // Clear search
        setSearchQuery('');
        toast.success(t('create.needs.wasAdded').replace('{{name}}', data.name_de));
      }
    } catch (error) {
      console.error('Error creating need:', error);
      toast.error(t('create.needs.errorCreating'));
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
        toast.error(t('create.needs.cannotDelete'));
      } else {
        // Remove from local state
        setNeeds(prev => prev.filter(n => n.need_id !== needId));
        // Remove from selected if it was selected
        updateFormData({ 
          needs_ids: formData.needs_ids.filter(id => id !== needId) 
        });
        toast.success(t('create.needs.wasDeleted').replace('{{name}}', needName));
      }
    } catch (error) {
      console.error('Error deleting need:', error);
      toast.error(t('create.needs.errorDeleting'));
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

  const handleBack = () => {
    router.push('/create/basics');
  };

  return (
    <Layout>
      <PageHeader
        className={cn(
          !isMobile && 'md:top-20 md:z-[100] [&>div]:md:px-0 [&>div]:md:max-w-full'
        )}
        customContent={
          !isMobile ? (
            <div className="w-full max-w-[640px] mx-auto px-6 md:px-8 flex items-center h-header-height-mobile sm:h-header-height-tablet">
              <button
                aria-label="Zurück"
                className="flex items-center justify-center w-8 h-8 -ml-1"
                onClick={handleBack}
              >
                <Icon 
                  className="w-8 h-8 text-content-heading pointer-events-none" 
                  icon="material-symbols:chevron-left" 
                />
              </button>
              <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
                {t('create.needs.title')}
              </h1>
            </div>
          ) : undefined
        }
        title={t('create.needs.title')}
        variant="back-and-title"
        onBack={isMobile ? "/create/basics" : undefined}
      />

      <PageContent 
        className={cn(
          'flex flex-col gap-8',
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        hasFooter={isMobile}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-2xl bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-3 flex-1">
                <Icon className="size-6 shrink-0 text-[#1B1D1D]" icon="lucide:search" />
                <input
                  className="flex-1 text-xs font-normal text-[#7C7C7C] leading-[15px] outline-none placeholder:text-[#7C7C7C] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent pl-0"
                  placeholder={t('create.needs.searchPlaceholder')}
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
              <p className="text-sm font-normal text-[#7A7A7A] leading-[17px] mb-6 pl-3">
                {t('create.needs.description')}
              </p>
            </div>
          </div>

          {/* Needs List */}
          <div className="flex-1 w-full pb-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('create.needs.loading')}</span>
              </div>
            ) : (
              <>
                {/* Selected Needs Section */}
                {filteredSelectedNeeds.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-primary bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.needs.selected')} ({filteredSelectedNeeds.length})
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
                              className="inline-flex rounded-xl px-4 py-2 pr-3 text-left transition-all duration-200 bg-primary-light text-content-heading border border-primary"
                              onClick={() => toggleNeed(need.need_id)}
                            >
                              <span className="text-sm font-medium">
                                {need.name_de}
                              </span>
                            </button>
                            {/* Delete button for user-created needs - always visible */}
                            {need.created_by === user?.id && (
                              <button
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                disabled={deletingId === need.need_id}
                                title={t('create.needs.delete')}
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
                          {t('create.needs.similarFound')}
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
                    <h3 className="mb-3 text-sm font-medium text-[#232323]">{t('create.needs.createNew')}</h3>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-primary text-white border border-primary hover:bg-primary-dark active:bg-primary-darker transition-all duration-200 disabled:opacity-50"
                      disabled={isCreating}
                      onClick={createNeedFromSearch}
                    >
                      <Icon className="h-4 w-4" icon="lucide:plus" />
                      <span className="text-sm font-medium">
                        {isCreating 
                          ? t('create.needs.creating') 
                          : t('create.needs.addButton').replace('{{query}}', searchQuery)}
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
                        {t('create.needs.recommendedFor').replace('{{category}}', selectedCategory?.name_de || '')}
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

                {/* Category-Related Other Needs */}
                {filteredCategoryRelatedNeeds.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.needs.moreNeeds') || 'Weitere Bedürfnisse'} ({filteredCategoryRelatedNeeds.length})
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
                        {filteredCategoryRelatedNeeds.map((need) => (
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

                {/* Unrelated Needs (from other categories) */}
                {filteredUnrelatedNeeds.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsUnrelatedExpanded(!isUnrelatedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        Other needs ({filteredUnrelatedNeeds.length})
                      </h3>
                      <Icon 
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                          isUnrelatedExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                        icon="lucide:chevron-down" 
                      />
                    </button>
                    {isUnrelatedExpanded && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
                        {filteredUnrelatedNeeds.map((need) => (
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
                {!showCreateOption && filteredSelectedNeeds.length === 0 && filteredSuggestedNeeds.length === 0 && filteredCategoryRelatedNeeds.length === 0 && filteredUnrelatedNeeds.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Icon className="h-12 w-12 text-gray-300" icon="lucide:search-x" />
                    <span className="text-gray-500">{t('create.needs.noNeedsFound')}</span>
                    {searchQuery && (
                      <p className="text-sm text-gray-400">
                        {t('create.needs.pressEnterToAdd').replace('{{query}}', searchQuery)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Desktop Save Button */}
            {!isMobile && (
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  fullWidth
                  disabled={formData.needs_ids.length === 0}
                  icon="lucide:save"
                  variant="primary"
                  onClick={handleSave}
                >
                  {`${t('actions.save')} (${formData.needs_ids.length})`}
                </Button>
              </div>
            )}
          </div>
      </PageContent>

      {/* Mobile Footer Action */}
      {isMobile && (
        <FooterAction
          actionButton={{
            label: `${t('actions.save')} (${formData.needs_ids.length})`,
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: formData.needs_ids.length === 0,
            variant: 'primary',
          }}
        />
      )}
    </Layout>
  );
}
