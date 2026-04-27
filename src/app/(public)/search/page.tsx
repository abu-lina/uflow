'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Search, MapPin } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import { ExpandSection } from '@/components/ui/ExpandSection';
import { Button } from '@/components/ui/Button';
import { WasMealResults } from '@/features/search/components/WasMealResults';
import { WasCategoryResults } from '@/features/search/components/WasCategoryResults';
import { WasServiceTypeResults } from '@/features/search/components/WasServiceTypeResults';
import { WerAudienceFilter, type WerAudienceSelectionChange } from '@/features/search/components/WerAudienceFilter';
import { WoCityResults, type WoRecentSearch } from '@/features/search/components/WoCityResults';
import { FilterSection } from '@/features/search/components/FilterSection';
import { UmmahFilterSection } from '@/features/search/components/UmmahFilterSection';
import { supabase } from '@/lib/supabase/client';
import type { Section } from '@/providers/search-provider';
import { type FoodConcept, type FoodCategory, type FoodMenuItem, searchFoodConcepts, searchFoodCategories, searchFoodMenuItems } from '@/services/offers';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';
import { type PopularCity, fetchPopularCities, fetchProviderCities, checkCityExists } from '@/services/providers';

/**
 * /search — dedicated search detail page (Figma node 212:785 "CreateSouk").
 *
 * Layout (mobile-first):
 *  - Header: back chevron + "Suchen" title
 *  - Section tabs: Food / Ummah / Stores
 *  - "Was?" accordion (open by default): search input + result rows
 *  - "Wo: …", "Wer: …", "Filter" accordions (collapsed)
 *  - Fixed bottom bar: "Clear all" + teal "Suchen" button
 *
 * Search execution is deferred — this is the visual shell.
 * useSearchParams wrapped in Suspense per Next.js 15 requirement.
 */

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  type AccordionKey = 'was' | 'wo' | 'wer' | 'filter';

  const urlSection = (searchParams.get('section') as Section) ?? 'food';
  const [selectedSection, setSelectedSection] = useState<Section>(urlSection);
  const [wasQuery, setWasQuery] = useState('');
  const [wasResults, setWasResults] = useState<FoodConcept[]>([]);
  const [isLoadingWas, setIsLoadingWas] = useState(false);
  const [isErrorWas, setIsErrorWas] = useState(false);
  const [categoryResults, setCategoryResults] = useState<FoodCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isErrorCategories, setIsErrorCategories] = useState(false);
  const [menuItemResults, setMenuItemResults] = useState<FoodMenuItem[]>([]);
  const [isLoadingMenuItems, setIsLoadingMenuItems] = useState(false);
  const [isErrorMenuItems, setIsErrorMenuItems] = useState(false);
  const [selectedWas, setSelectedWas] = useState<WasSelection | null>(null);
  const [openAccordion, setOpenAccordion] = useState<AccordionKey | null>('was');
  const [recentSearches, setRecentSearches] = useState<WasSelection[]>(() => {
    try {
      const stored = localStorage.getItem('uflow:recent-was-searches');
      return stored ? (JSON.parse(stored) as WasSelection[]).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [woInputQuery, setWoInputQuery] = useState('');
  const [selectedWoCity, setSelectedWoCity] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [cityCounts, setCityCounts] = useState<PopularCity[]>([]);
  const [isLoadingPopularCities, setIsLoadingPopularCities] = useState(false);
  const [isErrorPopularCities, setIsErrorPopularCities] = useState(false);
  const [recentWoSearches, setRecentWoSearches] = useState<WoRecentSearch[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem('uflow:recent-wo-searches');
      return stored ? (JSON.parse(stored) as WoRecentSearch[]).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isCheckingCityValidity, setIsCheckingCityValidity] = useState(false);
  const [isValidNoProviderCity, setIsValidNoProviderCity] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [werSelection, setWerSelection] = useState<WerAudienceSelectionChange | null>(null);
  const [werResetSignal, setWerResetSignal] = useState(0);

  // Fetch user session for authenticated notify-me flow
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }
    void checkAuth();
  }, []);

  // Fetch cities for location search (cities that currently have listings)
  useEffect(() => {
    async function loadCities() {
      setIsLoadingCities(true);
      try {
        const providerCities = await fetchProviderCities();
        setCities(providerCities);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    }
    void loadCities();
  }, []);

  // Load city counts once to power popular-city rows and provider-count subtitles.
  useEffect(() => {
    async function loadPopularCities() {
      setIsLoadingPopularCities(true);
      setIsErrorPopularCities(false);

      try {
        const rows = await fetchPopularCities(500);
        setCityCounts(rows);
      } catch {
        setCityCounts([]);
        setIsErrorPopularCities(true);
      } finally {
        setIsLoadingPopularCities(false);
      }
    }

    void loadPopularCities();
  }, []);

  // Debounced meal search in the "Was?" accordion.
  useEffect(() => {
    if (selectedSection !== 'food') {
      setWasResults([]);
      setIsLoadingWas(false);
      setIsErrorWas(false);
      return;
    }

    let isCancelled = false;
    const normalizedQuery = wasQuery.trim();

    if (normalizedQuery.length < 2) {
      setWasResults([]);
      setIsErrorWas(false);
      setIsLoadingWas(false);
      return;
    }

    setIsLoadingWas(true);
    setIsErrorWas(false);

    const timeoutId = window.setTimeout(async () => {
      try {
        const rows = await searchFoodConcepts({
          search_query: normalizedQuery,
          limit_count: 10,
        });

        if (isCancelled) {
          return;
        }

        setWasResults(rows);
        setIsErrorWas(false);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to search food concepts:', error);
          setIsErrorWas(true);
          setWasResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingWas(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [wasQuery, selectedSection]);

  // Debounced cuisine category search in the "Was?" accordion.
  // Empty query (< 2 chars) → top categories by provider count.
  // Non-empty → ranked text search.
  useEffect(() => {
    if (selectedSection !== 'food') {
      setCategoryResults([]);
      return;
    }

    let isCancelled = false;
    const normalizedQuery = wasQuery.trim();
    const queryForRpc = normalizedQuery.length >= 2 ? normalizedQuery : '';

    setIsLoadingCategories(true);
    setIsErrorCategories(false);

    const timeoutId = window.setTimeout(async () => {
      try {
        const rows = await searchFoodCategories({
          search_query: queryForRpc,
          limit_count: 3,
        });

        if (isCancelled) {
          return;
        }

        setCategoryResults(rows);
        setIsErrorCategories(false);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to search food categories:', error);
          setIsErrorCategories(true);
          setCategoryResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCategories(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [wasQuery, selectedSection]);

  // Debounced menu item search in the "Was?" accordion.
  // Only fires when query >= 2 chars; never called with empty string.
  useEffect(() => {
    if (selectedSection !== 'food') {
      setMenuItemResults([]);
      setIsLoadingMenuItems(false);
      setIsErrorMenuItems(false);
      return;
    }

    let isCancelled = false;
    const normalizedQuery = wasQuery.trim();

    if (normalizedQuery.length < 2) {
      setMenuItemResults([]);
      setIsErrorMenuItems(false);
      setIsLoadingMenuItems(false);
      return;
    }

    setIsLoadingMenuItems(true);
    setIsErrorMenuItems(false);

    const timeoutId = window.setTimeout(async () => {
      try {
        const rows = await searchFoodMenuItems({
          search_query: normalizedQuery,
          limit_count: 10,
        });

        if (isCancelled) {
          return;
        }

        setMenuItemResults(rows);
        setIsErrorMenuItems(false);
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to search food menu items:', error);
          setIsErrorMenuItems(true);
          setMenuItemResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMenuItems(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [wasQuery, selectedSection]);

  // Hydrate Wo default from onboarding-selected city (client storage only).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedCity = localStorage.getItem('selectedCity') ?? sessionStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedWoCity(storedCity);
      setWoInputQuery('');
    }
  }, []);

  // Validate unknown city inputs with a targeted lookup instead of full-table prefetch.
  useEffect(() => {
    let isCancelled = false;
    const normalizedQuery = selectedWoCity ? '' : woInputQuery.trim();

    if (!normalizedQuery) {
      setIsValidNoProviderCity(null);
      setIsCheckingCityValidity(false);
      return;
    }

    const hasProviderMatch = cities.some((city) =>
      city.toLowerCase().includes(normalizedQuery.toLowerCase())
    );

    if (hasProviderMatch || isLoadingCities) {
      setIsValidNoProviderCity(null);
      setIsCheckingCityValidity(false);
      return;
    }

    setIsCheckingCityValidity(true);
    const timeoutId = window.setTimeout(async () => {
      const exists = await checkCityExists(normalizedQuery);
      if (!isCancelled) {
        setIsValidNoProviderCity(exists);
        setIsCheckingCityValidity(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [woInputQuery, selectedWoCity, cities, isLoadingCities]);

  useEffect(() => {
    setWasQuery('');
    setSelectedWas(null);
    setSelectedFilters([]);
  }, [selectedSection]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleWasSelect = (selection: WasSelection) => {
    setSelectedWas(selection);
    setWasQuery('');
    setOpenAccordion(null);
    // Persist to recent searches (max 3, deduplicated by label)
    setRecentSearches((prev) => {
      const deduped = [selection, ...prev.filter((r) => r.label !== selection.label)].slice(0, 3);
      try {
        localStorage.setItem('uflow:recent-was-searches', JSON.stringify(deduped));
      } catch { /* storage unavailable */ }
      return deduped;
    });
  };

  const handleSearch = () => {
    if (!selectedWas) return;
    const params = new URLSearchParams({ section: selectedSection });
    if (selectedWas.type === 'category' && selectedWas.categoryId) {
      params.set('category', selectedWas.categoryId);
    } else {
      params.set('q', selectedWas.label);
    }
    if (selectedFilters.length > 0) {
      params.set('filters', selectedFilters.join(','));
    }
    router.push(`/providers?${params.toString()}`);
  };

  const handleWoSelect = (city: string) => {
    setSelectedWoCity(city);
    setWoInputQuery('');
    setOpenAccordion(null);

    setRecentWoSearches((prev) => {
      const next = [{ city }, ...prev.filter((entry) => entry.city !== city)].slice(0, 3);
      try {
        localStorage.setItem('uflow:recent-wo-searches', JSON.stringify(next));
      } catch {
        // Storage access can fail in private mode; keep UI state-only fallback.
      }
      return next;
    });
  };

  const handleWoClearSelection = () => {
    setSelectedWoCity(null);
    setWoInputQuery('');
  };

  const handleToggleFilter = (key: string) => {
    setSelectedFilters((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const woSearchQuery = selectedWoCity ? '' : woInputQuery;
  const shouldShowCityResults = !selectedWoCity && woSearchQuery.length > 0;
  const countByCity = new Map(cityCounts.map((entry) => [entry.city, entry.provider_count]));
  const filteredCities = !shouldShowCityResults
    ? []
    : cities
        .filter((city) => city.toLowerCase().includes(woSearchQuery.toLowerCase()))
        .slice(0, 10)
        .map((city) => ({
          city,
          provider_count: countByCity.get(city) ?? 0,
        }));
  const popularCities = cityCounts.slice(0, 5);
  const woAccordionTitle = selectedWoCity
    ? `${t('suchen.accordions.wo')}: ${selectedWoCity}`
    : t('suchen.accordions.wo');
  const werAccordionTitle = werSelection?.hasUserInteracted && werSelection.hasSelection
    ? `${t('suchen.accordions.wer')}: ${werSelection.summary}`
    : `${t('suchen.accordions.wer')}: ${t('suchen.wer.forMe')}`;
  const filterAccordionTitle = selectedFilters.length > 0
    ? `${t('suchen.accordions.filter')}: ${selectedFilters.length}`
    : t('suchen.accordions.filter');

  return (
    <ScrollablePageLayout background="bg-uflow-light">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <PageHeader
        title={t('suchen.title')}
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent hasFooter maxWidth="full" paddingX="px-4">
        {/* ── Section selector (sticky) ───────────────────────────────── */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-40 bg-uflow-light pb-4">
          <SectionSelector
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
          />
        </div>

        {/* ── Accordion body ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
        {/* Was? — controlled accordion; title shows selection when closed */}
        <ExpandSection
          isOpen={openAccordion === 'was'}
          title={
            selectedWas
              ? t('suchen.was.selectedWhat', { item: selectedWas.label })
              : t('suchen.accordions.was')
          }
          onToggle={(next) => setOpenAccordion(next ? 'was' : null)}
        >
          <div className="mt-3">
            {/* Search input */}
            <div className="flex items-center gap-3 px-3 h-10 rounded-xl bg-neutral-muted focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                aria-label="Angebote suchen"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none border-0 focus:outline-none focus:ring-0"
                placeholder={
                  selectedSection === 'ummah'
                    ? t('suchen.was.ummah.searchPlaceholder')
                    : t('suchen.was.searchPlaceholder')
                }
                type="search"
                value={wasQuery}
                onChange={(e) => setWasQuery(e.target.value)}
              />
            </div>

            {selectedSection === 'ummah' ? (
              <WasServiceTypeResults
                query={wasQuery}
                selectedServiceType={selectedWas}
                t={t}
                onClearSelection={() => setSelectedWas(null)}
                onSelect={handleWasSelect}
              />
            ) : (
              <>
                <WasCategoryResults
                  isError={isErrorCategories}
                  isLoading={isLoadingCategories}
                  items={categoryResults}
                  query={wasQuery}
                  recentSearches={recentSearches}
                  selectedWas={selectedWas}
                  t={t}
                  onClearSelection={() => setSelectedWas(null)}
                  onSelect={handleWasSelect}
                />
                <WasMealResults
                  hasCategoryResults={categoryResults.length > 0}
                  isError={isErrorWas || isErrorMenuItems}
                  isLoading={isLoadingWas || isLoadingMenuItems}
                  items={(() => {
                    const menuAsConcepts: FoodConcept[] = menuItemResults.map((m) => ({
                      offer_id: `mi:${m.name_de}`,
                      name_de: m.name_de,
                      name_en: m.name_en,
                      provider_count: m.provider_count,
                    }));
                    const seen = new Map<string, FoodConcept>();
                    for (const item of [...wasResults, ...menuAsConcepts]) {
                      const key = (item.name_de || '').toLowerCase();
                      const existing = seen.get(key);
                      if (!existing || item.provider_count > existing.provider_count) {
                        seen.set(key, item);
                      }
                    }
                    return Array.from(seen.values()).sort(
                      (a, b) =>
                        b.provider_count - a.provider_count ||
                        (a.name_de || '').localeCompare(b.name_de || '')
                    );
                  })()}
                  query={wasQuery}
                  t={t}
                  onSelect={(itemName) =>
                    handleWasSelect({ label: itemName, type: 'dish', dishName: itemName })
                  }
                />
              </>
            )}
          </div>
        </ExpandSection>

        {/* Wo / Wer / Filter — collapsed rows */}
        <ExpandSection
          isOpen={openAccordion === 'wo'}
          title={woAccordionTitle}
          onToggle={(next) => setOpenAccordion(next ? 'wo' : null)}
        >
          <div className="mt-3">
            {/* City search input */}
            <div className="flex items-center gap-3 px-3 h-10 rounded-xl bg-neutral-muted focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
              <MapPin className="w-4 h-4 text-text-muted shrink-0" />
              <input
                aria-label={t('suchen.citySearchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none border-0 focus:outline-none focus:ring-0"
                placeholder={t('suchen.citySearchPlaceholder')}
                type="search"
                value={woSearchQuery}
                onChange={(e) => {
                  setWoInputQuery(e.target.value);
                  if (selectedWoCity) {
                    setSelectedWoCity(null);
                  }
                }}
              />
            </div>

            <WoCityResults
              filteredCities={filteredCities}
              isCheckingCityValidity={isCheckingCityValidity}
              isError={isErrorPopularCities}
              isLoading={isLoadingCities || isLoadingPopularCities}
              isValidNoProviderCity={isValidNoProviderCity}
              popularCities={popularCities}
              query={woSearchQuery}
              recentSearches={recentWoSearches}
              selectedCity={selectedWoCity}
              t={t}
              userEmail={userEmail}
              onClearSelection={handleWoClearSelection}
              onSelect={handleWoSelect}
            />
          </div>
        </ExpandSection>

        <ExpandSection
          isOpen={openAccordion === 'wer'}
          title={werAccordionTitle}
          onToggle={(next) => setOpenAccordion(next ? 'wer' : null)}
        >
          <WerAudienceFilter
            resetSignal={werResetSignal}
            t={t}
            onSelectionChange={setWerSelection}
          />
        </ExpandSection>

        <ExpandSection
          isOpen={openAccordion === 'filter'}
          title={filterAccordionTitle}
          onToggle={(next) => setOpenAccordion(next ? 'filter' : null)}
        >
          {selectedSection === 'ummah' ? (
            <UmmahFilterSection
              selectedFilters={selectedFilters}
              t={t}
              onToggleFilter={handleToggleFilter}
            />
          ) : (
            <FilterSection
              selectedFilters={selectedFilters}
              selectedSection={selectedSection}
              t={t}
              onToggleFilter={handleToggleFilter}
            />
          )}
        </ExpandSection>
        </div>
      </PageContent>

      {/* ── Fixed bottom bar ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-between border-t border-border/30 px-6 pt-4"
        style={{
          background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
      >
        <button
          className="text-sm font-medium text-text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
          onClick={() => {
            setWasQuery('');
            setWasResults([]);
            setIsLoadingWas(false);
            setIsErrorWas(false);
            setSelectedWas(null);
            setOpenAccordion('was');
            setWoInputQuery('');
            setSelectedWoCity(null);
            setWerSelection(null);
            setWerResetSignal((prev) => prev + 1);
            setSelectedFilters([]);
            setSelectedSection('food');
          }}
        >
          {t('suchen.clearAll')}
        </button>
        <Button
          className="shadow-[0_8px_24px_rgba(88,157,150,0.25)]"
          disabled={!selectedWas}
          icon={<Heart className="w-4 h-4" />}
          onClick={handleSearch}
        >
          {t('suchen.searchButton')}
        </Button>
      </div>
    </ScrollablePageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
