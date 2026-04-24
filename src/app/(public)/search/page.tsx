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
import { EmptyCityCard } from '@/features/search/components/EmptyCityCard';
import { WasMealResults } from '@/features/search/components/WasMealResults';
import { WasCategoryResults } from '@/features/search/components/WasCategoryResults';
import { supabase } from '@/lib/supabase/client';
import type { Section } from '@/providers/search-provider';
import { type FoodConcept, type FoodCategory, type FoodMenuItem, searchFoodConcepts, searchFoodCategories, searchFoodMenuItems } from '@/services/offers';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';
import { fetchProviderCities, checkCityExists } from '@/services/providers';

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
  const [wasOpen, setWasOpen] = useState(true);
  const [recentSearches, setRecentSearches] = useState<WasSelection[]>(() => {
    try {
      const stored = localStorage.getItem('uflow:recent-was-searches');
      return stored ? (JSON.parse(stored) as WasSelection[]).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [woQuery, setWoQuery] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isCheckingCityValidity, setIsCheckingCityValidity] = useState(false);
  const [isValidNoProviderCity, setIsValidNoProviderCity] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // Debounced meal search in the "Was?" accordion.
  useEffect(() => {
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

  // Validate unknown city inputs with a targeted lookup instead of full-table prefetch.
  useEffect(() => {
    let isCancelled = false;
    const normalizedQuery = woQuery.trim();

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
  }, [woQuery, cities, isLoadingCities]);

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
    setWasOpen(false);
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
    router.push(`/providers?${params.toString()}`);
  };

  const filteredCities = woQuery.length === 0
    ? []
    : cities
      .filter((city) => city.toLowerCase().includes(woQuery.toLowerCase()))
      .slice(0, 10);

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
          isOpen={wasOpen}
          title={
            selectedWas
              ? t('suchen.was.selectedWhat', { item: selectedWas.label })
              : t('suchen.accordions.was')
          }
          onToggle={setWasOpen}
        >
          <div className="mt-3">
            {/* Search input */}
            <div className="flex items-center gap-3 px-3 h-10 rounded-xl bg-neutral-muted focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                aria-label="Angebote suchen"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none border-0 focus:outline-none focus:ring-0"
                placeholder={t('suchen.was.searchPlaceholder')}
                type="search"
                value={wasQuery}
                onChange={(e) => setWasQuery(e.target.value)}
              />
            </div>

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
          </div>
        </ExpandSection>

        {/* Wo / Wer / Filter — collapsed rows */}
        <ExpandSection title={t('suchen.accordions.wo')}>
          <div className="mt-3">
            {/* City search input */}
            <div className="flex items-center gap-3 px-3 h-10 rounded-xl bg-neutral-muted focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
              <MapPin className="w-4 h-4 text-text-muted shrink-0" />
              <input
                aria-label={t('suchen.citySearchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none border-0 focus:outline-none focus:ring-0"
                placeholder={t('suchen.citySearchPlaceholder')}
                type="search"
                value={woQuery}
                onChange={(e) => setWoQuery(e.target.value)}
              />
            </div>

            {/* City results */}
            {isLoadingCities ? (
              <p className="mt-4 text-sm text-text-muted text-center py-2">
                {t('common.loading')}...
              </p>
            ) : woQuery.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted text-center py-2">
                {t('suchen.searchCityPrompt')}
              </p>
            ) : filteredCities.length > 0 ? (
              <div className="mt-4 space-y-1">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-neutral-muted rounded-lg transition-colors"
                    onClick={() => {
                      setWoQuery(city);
                    }}
                  >
                    <MapPin className="w-4 h-4 inline-block mr-2 text-text-muted" />
                    {city}
                  </button>
                ))}
              </div>
            ) : isCheckingCityValidity || isValidNoProviderCity === null ? (
              <p className="mt-4 text-sm text-text-muted text-center py-2">
                {t('common.loading')}...
              </p>
            ) : isValidNoProviderCity ? (
              <EmptyCityCard cityName={woQuery} userEmail={userEmail} />
            ) : (
              <div className="mt-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-border-light">
                <p className="text-sm text-text-muted text-center">
                  {t('suchen.cityNotRecognized', { city: woQuery })}
                </p>
              </div>
            )}
          </div>
        </ExpandSection>

        <ExpandSection title={t('suchen.accordions.wer')}>
          <p className="mt-3 text-sm text-text-muted">
            {/* Provider filter — to be implemented */}
          </p>
        </ExpandSection>

        <ExpandSection title={t('suchen.accordions.filter')}>
          <p className="mt-3 text-sm text-text-muted">
            {/* Additional filters — to be implemented */}
          </p>
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
            setWasOpen(true);
            setWoQuery('');
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
