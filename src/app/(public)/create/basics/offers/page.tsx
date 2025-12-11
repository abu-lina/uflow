'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { validateOfferOrNeedName, findSimilarItems, calculateSimilarity, normalizeText, areSynonyms } from '@/utils/contentValidation';
import { validateAndSanitizeName } from '@/utils/sanitizeInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRateLimit } from '@/hooks/useRateLimit';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/common/error-boundary/ErrorBoundary';
import { OfferListSkeleton } from '@/components/ui/OfferListSkeleton';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export default function SelectOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suggestedOffers, setSuggestedOffers] = useState<SuggestedOffer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Collapsible section states
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(true);
  const [isSuggestedExpanded, setIsSuggestedExpanded] = useState(true);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  // Debounce search query to prevent excessive filtering
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Rate limiting: 10 offers per minute, 50 per hour
  const rateLimitKey = user ? `create-offer-${user.id}` : 'create-offer-anon';
  const { resetTime, checkLimit } = useRateLimit(
    rateLimitKey,
    10, // 10 offers per minute
    60 * 1000 // 1 minute window
  );

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

  // Load offers from database with pagination - initial load of 100 offers
  // Performance optimization: Load first 100 offers, then load more as needed
  const [hasMoreOffers, setHasMoreOffers] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const INITIAL_LIMIT = 100;
  const LOAD_MORE_LIMIT = 50;

  useEffect(() => {
    async function fetchOffers() {
      setIsLoading(true);
      try {
        // Fetch initial batch of offers (100 items for good balance)
        const { data, error } = await supabase
          .from('offers')
          .select('offer_id, name_de, name_en, created_at, updated_at, created_by, category_id')
          .order('name_de', { ascending: true })
          .limit(INITIAL_LIMIT + 1); // Fetch one extra to check if there are more
        
        if (error) {
          console.error('Error fetching offers:', error);
        } else if (data) {
          // Check if there are more offers
          const hasMore = data.length > INITIAL_LIMIT;
          setHasMoreOffers(hasMore);
          // Set offers (limit to INITIAL_LIMIT)
          setOffers(data.slice(0, INITIAL_LIMIT));
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchOffers();
  }, []);

  // Load more offers function
  const loadMoreOffers = useCallback(async () => {
    if (isLoadingMore || !hasMoreOffers) return;
    
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('offer_id, name_de, name_en, created_at, updated_at, created_by, category_id')
        .order('name_de', { ascending: true })
        .range(offers.length, offers.length + LOAD_MORE_LIMIT);
      
      if (error) {
        console.error('Error loading more offers:', error);
      } else if (data && data.length > 0) {
        setOffers(prev => [...prev, ...data]);
        // If we got fewer than requested, there are no more
        setHasMoreOffers(data.length === LOAD_MORE_LIMIT);
      } else {
        setHasMoreOffers(false);
      }
    } catch (error) {
      console.error('Error loading more offers:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offers.length, isLoadingMore, hasMoreOffers]);

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

  // Memoize suggested offer IDs set
  const suggestedOfferIds = useMemo(
    () => new Set(suggestedOffers.map(o => o.offer_id)),
    [suggestedOffers]
  );
  
  // Memoize selected offers
  const selectedOffers = useMemo(
    () => offers.filter(offer => formData.offers_ids.includes(offer.offer_id)),
    [offers, formData.offers_ids]
  );
  
  // Memoize available suggested offers (excluding selected)
  const availableSuggestedOffers = useMemo(
    () => suggestedOffers.filter(offer => !formData.offers_ids.includes(offer.offer_id)),
    [suggestedOffers, formData.offers_ids]
  );
  
  // Memoize other offers (from other categories or uncategorized, excluding suggested/selected)
  const otherOffers = useMemo(() => {
    return offers.filter(offer => {
      const isFromOtherCategory = formData.category 
        ? offer.category_id !== formData.category 
        : true;
      const isUncategorized = offer.category_id === null;
      const isNotSuggested = !suggestedOfferIds.has(offer.offer_id);
      const isNotSelected = !formData.offers_ids.includes(offer.offer_id);
      
      return (isFromOtherCategory || isUncategorized) && isNotSuggested && isNotSelected;
    });
  }, [offers, formData.category, formData.offers_ids, suggestedOfferIds]);

  // Memoize category-filtered offers (for validation and auto-select)
  const categoryFilteredOffers = useMemo(
    () => formData.category 
      ? offers.filter(offer => offer.category_id === formData.category)
      : offers,
    [offers, formData.category]
  );

  // Memoize search lower for filtering (use debounced value)
  const searchLower = useMemo(
    () => debouncedSearchQuery.toLowerCase().trim(),
    [debouncedSearchQuery]
  );

  // Memoize filtered lists based on debounced search
  const filteredSelectedOffers = useMemo(
    () => selectedOffers.filter(offer =>
      offer.name_de.toLowerCase().includes(searchLower)
    ),
    [selectedOffers, searchLower]
  );

  const filteredSuggestedOffers = useMemo(
    () => availableSuggestedOffers.filter(offer =>
      offer.name_de.toLowerCase().includes(searchLower)
    ),
    [availableSuggestedOffers, searchLower]
  );

  const filteredOtherOffers = useMemo(
    () => otherOffers.filter(offer =>
      offer.name_de.toLowerCase().includes(searchLower)
    ),
    [otherOffers, searchLower]
  );

  // Memoize exact match check
  const hasExactMatch = useMemo(
    () => categoryFilteredOffers.some(offer => 
      offer.name_de.toLowerCase() === searchLower
    ),
    [categoryFilteredOffers, searchLower]
  );

  // Memoize similar offers calculation (expensive operation)
  // CRITICAL: Use debouncedSearchQuery to prevent running on every keystroke
  // Only run if search query is long enough (>= 3 chars) to avoid expensive calculations
  const similarOffers = useMemo(() => {
    const trimmedQuery = debouncedSearchQuery.trim();
    
    // Early exit: Don't calculate if query is too short or exact match exists
    if (!trimmedQuery || trimmedQuery.length < 3 || hasExactMatch) {
      return [];
    }

    // Performance optimization: Limit the number of offers to check
    // Only check first 100 offers to avoid expensive calculations on large datasets
    const offersToCheck = categoryFilteredOffers.slice(0, 100);
    
    // Find similar items (this is expensive - O(n) with Levenshtein distance)
    const allSimilar = findSimilarItems(trimmedQuery, offersToCheck, 0.4, 10);
    
    // Filter by similarity threshold (avoid double calculation if possible)
    const filtered = allSimilar.filter(offer => {
      const similarity = calculateSimilarity(trimmedQuery, offer.name_de);
      return similarity <= 0.15; // Only very similar items (0.15 = 85% similarity)
    });
    
    // Remove synonyms to avoid duplicate suggestions (O(n²) but limited to small array)
    const uniqueSimilar: typeof filtered = [];
    const seen = new Set<string>();
    
    for (const offer of filtered) {
      const normalizedName = normalizeText(offer.name_de);
      let isSynonym = false;
      
      // Early exit if we already have enough results
      if (uniqueSimilar.length >= 3) break;
      
      // Check against already seen items (limited to small array)
      for (const seenName of Array.from(seen)) {
        if (areSynonyms(offer.name_de, seenName)) {
          isSynonym = true;
          break;
        }
      }
      
      if (!isSynonym) {
        uniqueSimilar.push(offer);
        seen.add(normalizedName);
      }
    }
    
    return uniqueSimilar;
  }, [debouncedSearchQuery, hasExactMatch, categoryFilteredOffers]);

  // Memoize show create option
  const showCreateOption = useMemo(
    () => searchQuery.trim() && !hasExactMatch,
    [searchQuery, hasExactMatch]
  );

  // Memoize selected category
  const selectedCategory = useMemo(
    () => categories.find(cat => cat.category_id === formData.category),
    [categories, formData.category]
  );

  // Toggle offer selection (multi-selection) - memoized with useCallback
  const toggleOffer = useCallback((offerId: string) => {
    const isCurrentlySelected = formData.offers_ids.includes(offerId);
    const offer = offers.find(o => o.offer_id === offerId);
    const offerName = offer?.name_de || offer?.name_en || '';
    
    const newOffers = isCurrentlySelected
      ? formData.offers_ids.filter(id => id !== offerId)
      : [...formData.offers_ids, offerId];
    
    updateFormData({ offers_ids: newOffers });
    
    // Show toast when offer is added (not when removed)
    if (!isCurrentlySelected && offerName) {
      toast.success(t('create.offers.wasAdded').replace('{{name}}', offerName));
    }
  }, [formData.offers_ids, offers, t, updateFormData]);

  // Create new offer from search query - memoized with useCallback
  const createOfferFromSearch = useCallback(async () => {
    if (!searchQuery.trim() || !user) return;
    
    // Check rate limit
    if (!checkLimit()) {
      const secondsRemaining = resetTime 
        ? Math.ceil((resetTime - Date.now()) / 1000)
        : 60;
      toast.error(
        t('create.offers.rateLimitExceeded')?.replace('{{seconds}}', secondsRemaining.toString()) ||
        `Rate limit exceeded. Please try again in ${secondsRemaining} seconds.`
      );
      return;
    }
    
    // Sanitize input to prevent XSS
    const sanitizedInput = validateAndSanitizeName(searchQuery.trim(), 100);
    if (!sanitizedInput) {
      toast.error(t('create.offers.errorCreating'));
      return;
    }
    
    // Validate the input
    const validation = validateOfferOrNeedName(sanitizedInput, offers, true);
    
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
        toast.info(
          t('create.offers.autoSelected').replace('{{name}}', existingOffer.name_de),
          {
            description: t('create.offers.autoSelectedDescription'),
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
        t('create.offers.similarEntriesDialog')
          .replace('{{similarNames}}', similarNames)
          .replace('{{query}}', sanitizedInput)
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
            toast.info(t('create.offers.wasSelected').replace('{{name}}', mostSimilar.name_de));
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
          name_de: sanitizedInput, // Use sanitized input
          created_by: user.id,
          category_id: formData.category || null
        }])
        .select()
        .single();
      
      if (error) {
        // Generic error message - don't leak implementation details
        console.error('Error creating offer:', error);
        // Check for unique constraint violation (but show generic message)
        if (error.code === '23505' || error.message.includes('unique')) {
          toast.error(t('create.offers.entryExists'));
        } else {
          toast.error(t('create.offers.errorCreating'));
        }
      } else if (data) {
        // Add to local state
        setOffers(prev => [...prev, data]);
        // Auto-select the new offer
        updateFormData({ offers_ids: [...formData.offers_ids, data.offer_id] });
        // Clear search
        setSearchQuery('');
        toast.success(t('create.offers.wasAdded').replace('{{name}}', data.name_de));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(t('create.offers.errorCreating'));
    } finally {
      setIsCreating(false);
    }
  }, [searchQuery, user, offers, formData.category, formData.offers_ids, t, updateFormData, checkLimit, resetTime]);

  // Delete an offer (only if user created it and it's not used) - memoized with useCallback
  const deleteOffer = useCallback(async (offerId: string, offerName: string) => {
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
        toast.error(t('create.offers.cannotDelete'));
      } else {
        // Remove from local state
        setOffers(prev => prev.filter(o => o.offer_id !== offerId));
        // Remove from selected if it was selected
        updateFormData({ 
          offers_ids: formData.offers_ids.filter(id => id !== offerId) 
        });
        toast.success(t('create.offers.wasDeleted').replace('{{name}}', offerName));
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error(t('create.offers.cannotDelete'));
    } finally {
      setDeletingId(null);
    }
  }, [user, formData.offers_ids, t, updateFormData]);

  // Save selected offers and return to create page - memoized with useCallback
  const handleSave = useCallback(() => {
    if (formData.offers_ids.length > 0) {
      router.push('/create/basics');
    }
  }, [formData.offers_ids, router]);

  const handleBack = () => {
    router.push('/create/basics');
  };

  return (
    <ErrorBoundary>
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
                  {t('create.offers.title')}
                </h1>
              </div>
            ) : undefined
          }
          title={t('create.offers.title')}
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
        <div className="flex flex-col gap-6">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-2xl bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-3 flex-1">
                <Icon className="size-6 shrink-0 text-[#1B1D1D]" icon="lucide:search" />
                <input
                  className="flex-1 text-base font-normal text-gray-600 outline-none placeholder:text-sm placeholder:text-gray-500 border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent pl-0"
                  placeholder={t('create.offers.searchPlaceholder')}
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
                    className="text-gray-500 hover:text-[#232323] transition-colors"
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
                {t('create.offers.description')}
              </p>
            </div>
          </div>

          {/* Offers List */}
          {isLoading ? (
            <OfferListSkeleton />
          ) : (
            <div className="flex flex-col gap-3">
                {/* Selected Offers Section */}
                {filteredSelectedOffers.length > 0 && (
                  <div className="rounded-2xl border border-primary bg-white/50 p-4 shadow-sm">
                    <button
                      aria-expanded={isSelectedExpanded}
                      aria-label={isSelectedExpanded 
                        ? t('create.offers.collapseSelected') || 'Collapse selected offers'
                        : t('create.offers.expandSelected') || 'Expand selected offers'
                      }
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.offers.selected')} ({filteredSelectedOffers.length})
                      </h3>
                      <Icon 
                        aria-hidden="true"
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
                              className="inline-flex rounded-xl px-4 py-2 pr-3 text-left transition-all duration-200 bg-primary-light text-content-heading border border-primary"
                              onClick={() => toggleOffer(offer.offer_id)}
                            >
                              <span className="text-sm font-medium">
                                {offer.name_de}
                              </span>
                            </button>
                            {/* Delete button for user-created offers - always visible */}
                            {offer.created_by === user?.id && (
                              <button
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                disabled={deletingId === offer.offer_id}
                                title={t('create.offers.delete')}
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
                          {t('create.offers.similarFound')}
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
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-[#232323]">{t('create.offers.createNew')}</h3>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-primary text-white border border-primary hover:bg-primary-dark active:bg-primary-darker transition-all duration-200 disabled:opacity-50"
                      disabled={isCreating}
                      onClick={createOfferFromSearch}
                    >
                      <Icon className="h-4 w-4" icon="lucide:plus" />
                      <span className="text-sm font-medium">
                        {isCreating 
                          ? t('create.offers.creating') 
                          : t('create.offers.addButton').replace('{{query}}', searchQuery)}
                      </span>
                    </button>
                  </div>
                )}

                {/* Suggested Offers (based on category) */}
                {filteredSuggestedOffers.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white/50 p-4 shadow-sm">
                    <button
                      aria-expanded={isSuggestedExpanded}
                      aria-label={isSuggestedExpanded
                        ? t('create.offers.collapseRecommended') || 'Collapse recommended offers'
                        : t('create.offers.expandRecommended') || 'Expand recommended offers'
                      }
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSuggestedExpanded(!isSuggestedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.offers.recommendedFor').replace('{{category}}', selectedCategory?.name_de || '')}
                      </h3>
                      <Icon 
                        aria-hidden="true"
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
                      aria-expanded={isOtherExpanded}
                      aria-label={isOtherExpanded
                        ? t('create.offers.collapseMoreOffers') || 'Collapse more offers'
                        : t('create.offers.expandMoreOffers') || 'Expand more offers'
                      }
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {(filteredSuggestedOffers.length > 0 ? t('create.offers.moreOffers') : t('create.offers.availableOffers'))} ({filteredOtherOffers.length})
                      </h3>
                      <Icon 
                        aria-hidden="true"
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
                    <span className="text-gray-500">{t('create.offers.noOffersFound')}</span>
                    {searchQuery && (
                      <p className="text-sm text-gray-400">
                        {t('create.offers.pressEnterToAdd').replace('{{query}}', searchQuery)}
                      </p>
                    )}
                  </div>
                )}

                {/* Load More button for other offers */}
                {hasMoreOffers && !searchQuery && filteredOtherOffers.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-6 py-2 bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                      disabled={isLoadingMore}
                      onClick={loadMoreOffers}
                    >
                      <Icon className="h-4 w-4" icon={isLoadingMore ? "lucide:loader-2" : "lucide:chevron-down"} />
                      <span className="text-sm font-medium">
                        {isLoadingMore 
                          ? t('create.offers.loading') || 'Loading...'
                          : t('create.offers.loadMore') || 'Load More Offers'}
                      </span>
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* Desktop Save Button */}
          {!isMobile && (
            <div className="flex flex-col gap-3 pt-4">
              <Button
                fullWidth
                disabled={formData.offers_ids.length === 0}
                icon="lucide:save"
                variant="primary"
                onClick={handleSave}
              >
                {`${t('actions.save')} (${formData.offers_ids.length})`}
              </Button>
            </div>
          )}
        </div>
      </PageContent>

      {/* Mobile Footer Action */}
      {isMobile && (
        <FooterAction
          actionButton={{
            label: `${t('actions.save')} (${formData.offers_ids.length})`,
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: formData.offers_ids.length === 0,
            variant: 'primary',
          }}
        />
      )}
      </Layout>
    </ErrorBoundary>
  );
}
