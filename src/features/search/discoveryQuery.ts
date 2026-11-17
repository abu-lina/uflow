import { SECTION_META, DEFAULT_SECTION } from '@/config/sectionFilters';
import type { Section } from '@/config/sectionFilters';
import {
  SEARCH_FILTER_KEY_SET,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';
import { slugify } from '@/lib/slugify';

const VALID_REVIEW_STATUSES = ['approved', 'pending', 'rejected', 'needs_revision', 'all'] as const;
export type ReviewStatus = (typeof VALID_REVIEW_STATUSES)[number];

export interface DiscoveryQuery {
  q: string;
  category: string | null;
  location: string;
  section: Section;
  filters: SearchFilterKey[] | undefined;
}

export interface RouteDiscoveryQuery {
  q: string;
  category: string | null;
  location: string;
  section: Section | undefined;
  filters: SearchFilterKey[] | undefined;
  status: ReviewStatus | undefined;
  statusError: string | undefined;
}

interface PathOverrides {
  city?: string | null;
  category?: string | null;
  section?: Section;
}

// ── Category → Section inference ────────────────────────────────────────

/** Stable UUID for "Essen & Trinken" (SPEISEN_CATEGORY_ID). */
const ESSEN_TRINKEN_CATEGORY_ID = '20c10efe-404b-4a39-bb81-5089a0332d78';

/** Stable UUID for "Gemeinschaft & Spenden". */
export const GEMEINSCHAFT_SPENDEN_CATEGORY_ID = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

/**
 * Infers the section from a category UUID.
 * Used for backward compat: legacy `/providers?category=...` URLs without
 * `?section=` are resolved by mapping the category to the correct section.
 */
export function inferSectionFromCategory(categoryId: string | null | undefined): Section {
  if (!categoryId) return 'store';
  if (categoryId === ESSEN_TRINKEN_CATEGORY_ID) return 'food';
  if (categoryId === GEMEINSCHAFT_SPENDEN_CATEGORY_ID) return 'ummah';
  return 'store';
}

// ── Section → path helpers ──────────────────────────────────────────────

/** Maps a section to its canonical public results route. */
export function getResultsPathForSection(section: Section): '/food' | '/stores' | '/ummah' {
  if (section === 'food') return '/food';
  if (section === 'ummah') return '/ummah';
  return '/stores';
}

/** The section `/` opens: DEFAULT_SECTION while active, otherwise the first active one. */
export function getHomeSection(): Section {
  if (SECTION_META[DEFAULT_SECTION].active) return DEFAULT_SECTION;
  const sections = Object.keys(SECTION_META) as Section[];
  return sections.find((section) => SECTION_META[section].active) ?? DEFAULT_SECTION;
}

/** `/` hands off to the home section route, keeping the incoming query string (#674). */
export function getHomeRedirectPath(params: URLSearchParams): string {
  const path = getResultsPathForSection(getHomeSection());
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Map view of the home section scoped to `city`; explicit params win (#674). */
export function getCityMapPath(city: string | null, params = new URLSearchParams()): string {
  const next = new URLSearchParams(params);
  if (city && !next.has('location')) next.set('location', city);
  if (!next.has('view')) next.set('view', 'map');
  return getHomeRedirectPath(next);
}

// ── Section resolution ──────────────────────────────────────────────────

/** Resolves section from URL params (no legacy business→store mapping). */
export function resolveSectionFromSearchParams(params: URLSearchParams): Section {
  const sectionParam = params.get('section');
  if (sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store') {
    return sectionParam;
  }

  const categoryParam = params.get('category');
  if (categoryParam) {
    return inferSectionFromCategory(categoryParam);
  }

  return 'food';
}

/**
 * Resolves section from route context.
 *
 * Precedence (#254):
 *   1. An explicit ?section= param — highest priority (deep links).
 *   2. The pathname — canonical section routes (/food, /ummah, /stores)
 *      are the section authority.
 *   3. inferSectionFromCategory — last resort for genuinely sectionless
 *      legacy URLs such as /providers?category=<parent-uuid>.
 */
export function resolveSectionFromRoute(
  pathname: string | null | undefined,
  params: URLSearchParams,
): Section {
  if (params.has('section')) {
    return resolveSectionFromSearchParams(params);
  }

  // Path-based resolution, stripping optional locale prefix (e.g. /de/food -> /food)
  const routePath = (pathname || '').replace(/^\/[a-z]{2}(?=\/)/, '');
  if (routePath === '/food' || routePath.startsWith('/food/')) return 'food';
  if (routePath === '/ummah' || routePath.startsWith('/ummah/')) return 'ummah';
  if (routePath === '/stores' || routePath.startsWith('/stores/')) return 'store';

  // Sectionless route: legacy ?category= inference, then the D9 default (food).
  return resolveSectionFromSearchParams(params);
}

// ── Parsers ─────────────────────────────────────────────────────────────

function parseFilters(raw: string | null): SearchFilterKey[] | undefined {
  if (!raw) return undefined;
  const parsed = raw
    .split(',')
    .map((key) => key.trim())
    .filter((key): key is SearchFilterKey => SEARCH_FILTER_KEY_SET.has(key));
  return parsed.length > 0 ? parsed : undefined;
}

export function parseDiscoveryQuery(
  params: URLSearchParams,
  overrides?: PathOverrides,
): DiscoveryQuery {
  const q = params.get('q') ?? '';
  const category = overrides?.category ?? (params.get('category') || null);
  const location = overrides?.city ?? params.get('location') ?? '';
  const filters = parseFilters(params.get('filters'));

  const rawSection = overrides?.section ?? 'food';
  const section: Section = SECTION_META[rawSection].active ? rawSection : 'food';

  return { q, category, location, section, filters };
}

export function parseDiscoveryQueryForRoute(params: URLSearchParams): RouteDiscoveryQuery {
  const q = params.get('q') ?? '';
  const category = params.get('category') || null;
  const location = params.get('location') ?? '';
  const filters = parseFilters(params.get('filters'));

  const sectionParam = params.get('section');
  const section: Section | undefined =
    sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store'
      ? sectionParam
      : undefined;

  const statusParam = params.get('status');
  let status: ReviewStatus | undefined;
  let statusError: string | undefined;

  if (statusParam) {
    if (VALID_REVIEW_STATUSES.includes(statusParam as ReviewStatus)) {
      status = statusParam as ReviewStatus;
    } else {
      statusError = `Invalid status value: ${statusParam}. Valid values are: ${VALID_REVIEW_STATUSES.join(', ')}`;
    }
  }

  return { q, category, location, section, filters, status, statusError };
}

// ── URL builders ────────────────────────────────────────────────────────

function splitUrl(url: string): [string, URLSearchParams] {
  try {
    const u = new URL(url);
    return [u.pathname, u.searchParams];
  } catch {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return [url, new URLSearchParams()];
    return [url.slice(0, qIndex), new URLSearchParams(url.slice(qIndex + 1))];
  }
}

function buildUrl(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Build a path-based results URL: /food/[city]/[category]?q=...&filters=...
 *
 * The category only rides in the path when both a city and a slug are
 * available (/food/berlin/kebab-doener). In every other case it falls back
 * to the ?category=<id> query param (#254). A slug alone is never emitted
 * as ?category= because the service only accepts category UUIDs.
 */
export function buildResultsUrl(opts: {
  section: Section;
  city?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  query?: string | null;
  filters?: string[];
  status?: string | null;
}): string {
  const { section, city, categorySlug, categoryId, query, filters, status } = opts;
  let path = getResultsPathForSection(section);

  const categoryInPath = Boolean(city && categorySlug);
  if (city) {
    path += `/${slugify(city)}`;
    if (categorySlug) {
      path += `/${categorySlug}`;
    }
  }

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (categoryId && !categoryInPath) params.set('category', categoryId);
  if (filters && filters.length > 0) params.set('filters', filters.join(','));
  if (status) params.set('status', status);

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildSearchPageLink(section: Section, extraParams?: URLSearchParams): string {
  const params = extraParams ? new URLSearchParams(extraParams) : new URLSearchParams();
  params.set('section', section);
  return `/search?${params.toString()}`;
}

/**
 * Build a full results URL from search page selections.
 * Uses path-based routing: /food/[city]/[category-slug]
 */
export function buildSearchResultsUrl(opts: {
  selectedWas: WasSelection | null;
  selectedSection: Section;
  selectedCity?: string | null;
  selectedFilters?: string[];
}): string {
  const { selectedWas, selectedSection, selectedCity, selectedFilters } = opts;

  let categorySlug: string | null = null;
  let categoryId: string | null = null;
  let query: string | null = null;

  if (selectedWas?.type === 'category' && selectedWas.categoryId) {
    categorySlug = selectedWas.categorySlug ?? null;
    categoryId = selectedWas.categoryId;
  } else if (selectedWas?.type === 'dish' || selectedWas?.type === 'service-type') {
    query = selectedWas.label;
  }

  return buildResultsUrl({
    section: selectedSection,
    city: selectedCity,
    categorySlug,
    categoryId,
    query,
    filters: selectedFilters,
  });
}

export function buildSectionChangeLink(currentUrl: string, nextSection: Section): string {
  const [, params] = splitUrl(currentUrl);
  const next = new URLSearchParams();
  const q = params.get('q');
  const filters = params.get('filters');
  if (q) next.set('q', q);
  if (filters) next.set('filters', filters);
  return buildUrl(getResultsPathForSection(nextSection), next);
}

export function buildStatusChangeLink(currentUrl: string, status: string | null): string {
  const [path, params] = splitUrl(currentUrl);
  params.delete('section');
  if (status) {
    params.set('status', status);
  } else {
    params.delete('status');
  }
  return buildUrl(path, params);
}

export function buildSearchTermLink(currentUrl: string, text: string): string {
  const [path, params] = splitUrl(currentUrl);
  params.delete('section');
  const trimmed = text.trim();
  if (trimmed) {
    params.set('q', trimmed);
  } else {
    params.delete('q');
  }
  return buildUrl(path, params);
}

export function buildNearMeLink(opts: {
  section: Section;
  active: boolean;
  openNow: boolean;
  pathname: string;
  searchParams: { toString(): string };
}): string {
  const { section, active, openNow, pathname, searchParams } = opts;
  const basePath = active ? getResultsPathForSection(section) : pathname;
  const params = new URLSearchParams(searchParams.toString());

  if (active) {
    params.set('near_me', '1');
  } else {
    params.delete('near_me');
  }

  if (openNow) {
    params.set('open_now', '1');
  } else {
    params.delete('open_now');
  }

  params.delete('near_lat');
  params.delete('near_lon');
  params.delete('near_radius');

  return buildUrl(basePath, params);
}

export function buildViewToggleLink(
  currentUrl: string,
  nextView: string,
  defaultView: string,
): string {
  const [path, params] = splitUrl(currentUrl);
  if (nextView === defaultView) {
    params.delete('view');
  } else {
    params.set('view', nextView);
  }
  return buildUrl(path, params);
}

// ── Browser reader ───────────────────────────────────────────────────────

const BROWSER_STATUS_VALUES = new Set(['approved', 'pending', 'rejected', 'needs_revision']);
const VIEW_VALUES = new Set(['map', 'list']);

export interface BrowserDiscoveryQuery {
  q: string;
  category: string | null;
  location: string;
  section: Section;
  filters: SearchFilterKey[] | undefined;
  nearMe: boolean;
  openNow: boolean;
  status: string | null;
  view: string | null;
}

export function readDiscoveryQueryInBrowser(
  pathname: string,
  params: URLSearchParams,
  overrides?: { category?: string | null; city?: string | null },
): BrowserDiscoveryQuery {
  const q = params.get('q') ?? '';
  const category = overrides?.category ?? (params.get('category') || null);
  const location = overrides?.city ?? params.get('location') ?? '';
  const filters = parseFilters(params.get('filters'));
  const section = resolveSectionFromRoute(pathname, params);
  const nearMe = params.get('near_me') === '1';
  const openNow = params.get('open_now') === '1';

  const statusParam = params.get('status');
  const status = statusParam && BROWSER_STATUS_VALUES.has(statusParam) ? statusParam : null;

  const viewParam = params.get('view');
  const view = viewParam && VIEW_VALUES.has(viewParam) ? viewParam : null;

  return { q, category, location, section, filters, nearMe, openNow, status, view };
}
