'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Search, MapPin } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ErrorBoundary } from '@/components/common/error-boundary/ErrorBoundary';
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
import type { MapPin as ProviderMapPin } from '@/features/search/components/SearchMap';
import { supabase } from '@/lib/supabase/client';
import type { Section } from '@/providers/search-provider';
import { buildSearchParams, toFoodRecentSearches } from '@/lib/search-params';
import { getResultsPathForSection, SECTION_META } from '@/config/sectionFilters';
import { toast } from 'sonner';
import { type FoodConcept, type FoodCategory, type FoodMenuItem, searchFoodConcepts, searchFoodCategories, searchFoodMenuItems } from '@/services/offers';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';
import { type PopularCity, fetchPopularCities, fetchProviderCities, checkCityExists } from '@/services/providers';

// Leaflet accesses browser globals on import — load only on client side
const SearchMap = dynamic(
  () => import('@/features/search/components/SearchMap').then((m) => ({ default: m.SearchMap })),
  { ssr: false, loading: () => null }
);

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
  const isMobile = useIsMobile();

  type AccordionKey = 'was' | 'wo' | 'wer' | 'filter';

  const resolveSection = (rawSection: string | null): Section => {
    const section = rawSection === 'business' ? 'store' : rawSection;
    if (section === 'ummah' || section === 'store') {
      return SECTION_META[section].active ? section : 'food';
    }
    return 'food';
  };

  const urlSection = resolveSection(searchParams.get('section'));
  const urlQuery = (searchParams.get('q') || '').trim();
  const urlView = searchParams.get('view');
  const [selectedSection, setSelectedSection] = useState<Section>(urlSection);
  const [wasQuery, setWasQuery] = useState(urlQuery);
  const [wasResults, setWasResults] = useState<FoodConcept[]>([]);
  const [isLoadingWas, setIsLoadingWas] = useState(false);
  const [isErrorWas, setIsErrorWas] = useState(false);
  const [categoryResults, setCategoryResults] = useState<FoodCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isErrorCategories, setIsErrorCategories] = useState(false);
  const [menuItemResults, setMenuItemResults] = useState<FoodMenuItem[]>([]);
  const [isLoadingMenuItems, setIsLoadingMenuItems] = useState(false);
  const [isErrorMenuItems, setIsErrorMenuItems] = useState(false);
const [selectedWas, setSelectedWas] = useState<WasSelection | null>(() => {
    if (urlSection === 'food') {
      return { type: 'all-restaurants' as const, label: t('suchen.was.everything') };
    }
    return null;
  });
  const [openAccordion, setOpenAccordion] = useState<AccordionKey | null>('was');
  const [recentSearches, setRecentSearches] = useState<WasSelection[]>(() => {
    try {
      const stored = localStorage.getItem('uflow:recent-was-searches');
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored) as WasSelection[];
      return toFoodRecentSearches(parsed);
    } catch {
      return [];
    }
  });
  const [recentUmmahSearches, setRecentUmmahSearches] = useState<WasSelection[]>(() => {
    try {
      const stored = localStorage.getItem('uflow:recent-ummah-service-types');
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored) as WasSelection[];
      return parsed.filter((entry) => entry.type === 'service-type').slice(0, 3);
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
  const [mapPins, setMapPins] = useState<ProviderMapPin[]>([]);

  // Fetch user session for authenticated notify-me flow
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }
    void checkAuth();
  }, []);

  // Clean legacy mixed-section entries from storage after initial render.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('uflow:recent-was-searches');
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as WasSelection[];
      const foodRecentSearches = toFoodRecentSearches(parsed);

      if (foodRecentSearches.length !== parsed.length) {
        localStorage.setItem('uflow:recent-was-searches', JSON.stringify(foodRecentSearches));
      }
    } catch {
      // Ignore storage parsing failures to keep search page usable.
    }
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

  // Load city counts to power popular-city rows and provider-count subtitles.
  // Refetches when section changes so counts are section-filtered.
  useEffect(() => {
    async function loadPopularCities() {
      setIsLoadingPopularCities(true);
      setIsErrorPopularCities(false);

      try {
        const rows = await fetchPopularCities(500, selectedSection);
        setCityCounts(rows);
      } catch {
        setCityCounts([]);
        setIsErrorPopularCities(true);
      } finally {
        setIsLoadingPopularCities(false);
      }
    }

    void loadPopularCities();
  }, [selectedSection]);

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
  // Session flag prevents re-hydration after user explicitly cleared this session.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const clearedThisSession = sessionStorage.getItem('uflow:wo-cleared-this-session');
    if (clearedThisSession) return;

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
    setSelectedWas(
    selectedSection === 'food'
      ? { type: 'all-restaurants' as const, label: t('suchen.was.everything') }
      : null
  );
    setSelectedFilters([]);
    setOpenAccordion((prev) => (selectedSection === 'store' && prev === 'wer' ? 'was' : prev));
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection !== urlSection) {
      setSelectedSection(urlSection);
    }
  }, [selectedSection, urlSection]);

  useEffect(() => {
    setWasQuery(urlQuery);
  }, [urlQuery]);

  // Load food provider pins for map mode — only fetches when mobile + food section + view=map
  useEffect(() => {
    if (!isMobile || selectedSection !== 'food' || urlView !== 'map') { setMapPins([]); return; }
    let cancelled = false;
    type RawPin = { provider_id: string; location_latitude: number; location_longitude: number; providers: { provider_name: string | null } | { provider_name: string | null }[] | null };
    async function loadPins() {
      const { data } = await supabase
        .from('locations')
        .select('provider_id, location_latitude, location_longitude, providers!inner(provider_name)')
        .not('location_latitude', 'is', null)
        .not('location_longitude', 'is', null)
        .eq('providers.listing_type', 'food')
        .eq('providers.review_status', 'approved');
      if (cancelled || !Array.isArray(data)) return;
      setMapPins(
        (data as RawPin[]).map((row) => ({
          providerId: row.provider_id,
          providerName: (Array.isArray(row.providers) ? row.providers[0]?.provider_name : row.providers?.provider_name) ?? 'Provider',
          lat: Number(row.location_latitude),
          lng: Number(row.location_longitude),
        }))
      );
    }
    void loadPins();
    return () => { cancelled = true; };
  }, [isMobile, selectedSection, urlView]);

  const handleSectionChange = (section: Section) => {
    if (!SECTION_META[section].active) {
      const label = t(SECTION_META[section].labelKey);
      toast.info(t('sections.comingSoon', { section: label }), {
        description: t('sections.comingSoonDescription'),
        position: 'bottom-center',
      });
      return;
    }
    if (section === urlSection) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`/search?${params.toString()}`);
  };

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

    // Persist food-only recent searches (max 3, deduplicated by label).
    if (selectedSection === 'food') {
      setRecentSearches((prev) => {
        const deduped = [selection, ...prev.filter((r) => r.label !== selection.label)].slice(0, 3);
        try {
          localStorage.setItem('uflow:recent-was-searches', JSON.stringify(deduped));
        } catch {
          // Storage access can fail in private mode; keep UI state-only fallback.
        }
        return deduped;
      });
    }

    if (selectedSection === 'ummah' && selection.type === 'service-type') {
      setRecentUmmahSearches((prev) => {
        const deduped = [selection, ...prev.filter((r) => r.label !== selection.label)].slice(0, 3);
        try {
          localStorage.setItem('uflow:recent-ummah-service-types', JSON.stringify(deduped));
        } catch {
          // Storage access can fail in private mode; keep UI state-only fallback.
        }
        return deduped;
      });
    }
  };

  const handleSearch = () => {
    if (!selectedWas) return;
    const params = buildSearchParams(selectedWas, selectedSection);
    if (selectedFilters.length > 0) {
      params.set('filters', selectedFilters.join(','));
    }

    if (selectedWoCity) {
      params.set('location', selectedWoCity);
    }

    if (werSelection?.hasUserInteracted && werSelection.hasSelection && werSelection.summary.trim()) {
      params.set('wer', werSelection.summary.trim());
    }

    router.push(`${getResultsPathForSection(selectedSection)}?${params.toString()}`);
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
    localStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedCity');
    sessionStorage.setItem('uflow:wo-cleared-this-session', 'true');
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
  const woAccordionTitle = selectedWoCity
    ? `${t('suchen.accordions.wo')}: ${selectedWoCity}`
    : t('suchen.accordions.woEmpty');
  const werAccordionTitle = werSelection?.hasUserInteracted && werSelection.hasSelection
    ? `${t('suchen.accordions.wer')}: ${werSelection.summary}`
    : `${t('suchen.accordions.wer')}: ${t('suchen.wer.forMe')}`;
  const filterAccordionTitle = selectedFilters.length > 0
    ? `${t('suchen.accordions.filter')}: ${selectedFilters.length}`
    : t('suchen.accordions.filter');
  const isMobileFoodMapMode = isMobile && selectedSection === 'food' && urlView === 'map';

  const accordionBody = (
    <div className="flex flex-col gap-2">
      {/* Wo — now first */}
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
            popularCities={cityCounts}
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
              aria-label={selectedSection === 'ummah' ? t('suchen.was.ummah.searchPlaceholder') : t('suchen.was.searchPlaceholder')}
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
              recentSearches={recentUmmahSearches}
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
                onClearSelection={() => setSelectedWas({ type: 'all-restaurants' as const, label: t('suchen.was.everything') })}
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

      {selectedSection !== 'store' ? (
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
      ) : null}

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
  );

  return (
    <ScrollablePageLayout background="bg-uflow-light">
      {/* ── Header ────────────────────────────────────────────────────── */}
      {!isMobileFoodMapMode && (
        <PageHeader
          title={t('suchen.title')}
          variant="back-and-title"
          onBack={handleBack}
        />
      )}

      <PageContent hasFooter maxWidth="full" paddingX="px-4">
        {/* ── Section selector (sticky) ───────────────────────────────── */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-40 bg-uflow-light pb-4">
          <SectionSelector
            selectedSection={selectedSection}
            onSectionChange={handleSectionChange}
          />
        </div>

        {/* ── Main body ───────────────────────────────────────────── */}
        {isMobileFoodMapMode ? (
          <ErrorBoundary fallback={accordionBody}>
            <SearchMap pins={mapPins} />
          </ErrorBoundary>
        ) : (
          accordionBody
        )}
      </PageContent>

      {/* ── Fixed bottom bar ─────────────────────────────────────────── */}
      {!isMobileFoodMapMode ? (
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
              setSelectedWas({ type: 'all-restaurants' as const, label: t('suchen.was.everything') });
              setOpenAccordion('was');
              setWoInputQuery('');
              setSelectedWoCity(null);
              setWerSelection(null);
              setWerResetSignal((prev) => prev + 1);
              setSelectedFilters([]);
              handleSectionChange('food');
              localStorage.removeItem('selectedCity');
              sessionStorage.removeItem('selectedCity');
              sessionStorage.setItem('uflow:wo-cleared-this-session', 'true');
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
      ) : null}
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
