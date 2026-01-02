'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { getSuggestedOffersForCategory, type SuggestedOffer } from '@/services/category-suggestions';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { validateOfferOrNeedName, normalizeText } from '@/utils/contentValidation';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isSelectedExpanded, setIsSelectedExpanded] = useState(true);
  const [isSuggestedExpanded, setIsSuggestedExpanded] = useState(true);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsSmallMobile();

  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const rateLimitKey = user ? `create-offer-${user.id}` : 'create-offer-anon';
  const { resetTime, checkLimit } = useRateLimit(
    rateLimitKey,
    10,
    60 * 1000
  );


  useEffect(() => {
    async function fetchOffers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .limit(100)
          .order('name_de', { ascending: true });
        
        if (error) throw error;
        setOffers(data || []);
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchOffers();
  }, []);

  useEffect(() => {
    async function loadSuggestedOffers() {
      if (!formData.category) return;
      
      try {
        const suggested = await getSuggestedOffersForCategory(formData.category);
        setSuggestedOffers(suggested);
      } catch (error) {
        console.error('Error loading suggested offers:', error);
      }
    }
    
    void loadSuggestedOffers();
  }, [formData.category]);

  const filteredSelectedOffers = useMemo(() => {
    return offers.filter(o => formData.offers_ids.includes(o.offer_id));
  }, [offers, formData.offers_ids]);

  const filteredSuggestedOffers = useMemo(() => {
    if (!formData.category) return [];
    const suggestedIds = suggestedOffers.map(s => s.offer_id);
    return offers.filter(o => 
      suggestedIds.includes(o.offer_id) && 
      !formData.offers_ids.includes(o.offer_id)
    );
  }, [offers, suggestedOffers, formData.category, formData.offers_ids]);

  const filteredOtherOffers = useMemo(() => {
    const selectedIds = new Set(formData.offers_ids);
    const suggestedIds = new Set(suggestedOffers.map(s => s.offer_id));
    
    return offers.filter(o => {
      if (selectedIds.has(o.offer_id)) return false;
      if (suggestedIds.has(o.offer_id)) return false;
      
      if (!debouncedSearchQuery) return true;
      
      const normalizedQuery = normalizeText(debouncedSearchQuery);
      const normalizedName = normalizeText(o.name_de);
      return normalizedName.includes(normalizedQuery);
    });
  }, [offers, formData.offers_ids, suggestedOffers, debouncedSearchQuery]);

  const toggleOffer = (offerId: string) => {
    const newOffers = formData.offers_ids.includes(offerId)
      ? formData.offers_ids.filter(id => id !== offerId)
      : [...formData.offers_ids, offerId];
    updateFormData({ offers_ids: newOffers });
  };

  const createOfferFromSearch = useCallback(async () => {
    const isRecommendationMode = formData.creationMode === 'recommendation';
    
    if (!searchQuery.trim()) return;
    if (!user && !isRecommendationMode) {
      toast.error(t('create.offers.mustBeLoggedIn') || 'You must be logged in to create an offer');
      return;
    }
    
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
    
    const sanitizedInput = validateAndSanitizeName(searchQuery.trim(), 100);
    if (!sanitizedInput) {
      toast.error(t('create.offers.errorCreating'));
      return;
    }
    
    const validation = validateOfferOrNeedName(sanitizedInput, offers, true);
    
    if (validation.shouldAutoSelect) {
      const similarName = validation.shouldAutoSelect.item.name_de;
      const existingOffer = offers.find(o => o.name_de === similarName);
      if (existingOffer) {
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
    
    if (!validation.isValid) {
      toast.error(validation.errors[0] || t('create.offers.errorCreating'));
      return;
    }
    
    if (validation.similarItems && validation.similarItems.length > 0) {
      const similarNames = validation.similarItems.map(item => item.name_de).join(', ');
      const confirmed = window.confirm(
        t('create.offers.similarEntriesDialog')
          .replace('{{similarNames}}', similarNames)
          .replace('{{query}}', sanitizedInput)
      );
      if (!confirmed) {
        const firstSimilar = validation.similarItems?.[0];
        if (firstSimilar) {
          const mostSimilar = offers.find(o => o.name_de === firstSimilar.name_de);
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
          name_de: sanitizedInput,
          created_by: user?.id || null,
          category_id: formData.category || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating offer:', error);
        if (error.code === '23505' || error.message.includes('unique')) {
          toast.error(t('create.offers.entryExists'));
        } else {
          toast.error(t('create.offers.errorCreating'));
        }
      } else if (data) {
        setOffers(prev => [...prev, data]);
        updateFormData({ offers_ids: [...formData.offers_ids, data.offer_id] });
        setSearchQuery('');
        toast.success(t('create.offers.wasAdded').replace('{{name}}', data.name_de));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(t('create.offers.errorCreating'));
    } finally {
      setIsCreating(false);
    }
  }, [searchQuery, user, offers, formData.category, formData.offers_ids, formData.creationMode, t, updateFormData, checkLimit, resetTime]);

  const handleSave = useCallback(() => {
    if (formData.offers_ids.length > 0) {
      router.push('/create/recommend');
    }
  }, [formData.offers_ids, router]);

  const handleBack = () => {
    router.push('/create/recommend');
  };

  const showCreateOption = searchQuery.trim() && !offers.some(o => 
    normalizeText(o.name_de) === normalizeText(searchQuery.trim())
  );

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
                  aria-label={t('common.back')}
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
          onBack={isMobile ? handleBack : undefined}
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
            <div className="flex w-full flex-col gap-2">
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

              <div className="w-full">
                <p className="text-sm font-normal text-[#7A7A7A] leading-[17px] mb-6 pl-3">
                  {t('create.offers.description')}
                </p>
              </div>
            </div>

            {isLoading ? (
              <OfferListSkeleton />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredSelectedOffers.length > 0 && (
                  <div className="rounded-2xl border border-primary bg-white/50 p-4 shadow-sm">
                    <button
                      aria-expanded={isSelectedExpanded}
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSelectedExpanded(!isSelectedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.offers.selected')} ({filteredSelectedOffers.length})
                      </h3>
                      <Icon 
                        aria-hidden="true"
                        className="h-5 w-5 text-content-muted transition-transform"
                        icon={isSelectedExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                      />
                    </button>
                    {isSelectedExpanded && (
                      <div className="flex flex-wrap gap-2">
                        {filteredSelectedOffers.map(offer => (
                          <button
                            key={offer.offer_id}
                            className="flex items-center gap-2 rounded-xl bg-primary-light px-3 py-2 text-sm font-medium text-primary border border-primary"
                            onClick={() => toggleOffer(offer.offer_id)}
                          >
                            <span>{offer.name_de}</span>
                            <Icon className="h-4 w-4" icon="lucide:x" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredSuggestedOffers.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <button
                      aria-expanded={isSuggestedExpanded}
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsSuggestedExpanded(!isSuggestedExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.offers.recommendedFor').replace('{{category}}', formData.category ? t('create.recommend.category') : '')}
                      </h3>
                      <Icon 
                        aria-hidden="true"
                        className="h-5 w-5 text-content-muted transition-transform"
                        icon={isSuggestedExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                      />
                    </button>
                    {isSuggestedExpanded && (
                      <div className="flex flex-wrap gap-2">
                        {filteredSuggestedOffers.map(offer => (
                          <button
                            key={offer.offer_id}
                            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#232323] border border-gray-200 hover:border-primary hover:bg-primary-light transition-colors"
                            onClick={() => toggleOffer(offer.offer_id)}
                          >
                            <span>{offer.name_de}</span>
                            <Icon className="h-4 w-4" icon="lucide:plus" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredOtherOffers.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <button
                      aria-expanded={isOtherExpanded}
                      className="mb-3 flex items-center justify-between w-full text-left"
                      onClick={() => setIsOtherExpanded(!isOtherExpanded)}
                    >
                      <h3 className="text-md font-medium text-[#232323]">
                        {t('create.offers.availableOffers')}
                      </h3>
                      <Icon 
                        aria-hidden="true"
                        className="h-5 w-5 text-content-muted transition-transform"
                        icon={isOtherExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                      />
                    </button>
                    {isOtherExpanded && (
                      <div className="flex flex-wrap gap-2">
                        {filteredOtherOffers.map(offer => (
                          <button
                            key={offer.offer_id}
                            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#232323] border border-gray-200 hover:border-primary hover:bg-primary-light transition-colors"
                            onClick={() => toggleOffer(offer.offer_id)}
                          >
                            <span>{offer.name_de}</span>
                            <Icon className="h-4 w-4" icon="lucide:plus" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showCreateOption && (
                  <button
                    className="flex items-center gap-2 rounded-xl bg-primary-light px-4 py-3 text-sm font-medium text-primary border border-primary hover:bg-primary hover:text-white transition-colors"
                    disabled={isCreating}
                    onClick={createOfferFromSearch}
                  >
                    <Icon className="h-5 w-5" icon="lucide:plus" />
                    <span>{t('create.offers.addButton').replace('{{query}}', searchQuery.trim())}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="flex flex-col gap-3 pt-4">
              <Button
                fullWidth
                disabled={formData.offers_ids.length === 0}
                icon="lucide:save"
                variant="primary"
                onClick={handleSave}
              >
                {t('actions.save')}
              </Button>
            </div>
          )}
        </PageContent>

        {isMobile && (
          <FooterAction
            actionButton={{
              label: t('actions.save'),
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

