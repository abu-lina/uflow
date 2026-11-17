import {
  getResultsPathForSection,
  resolveSectionFromRoute,
  SECTION_META,
} from '@/config/sectionFilters';
import type { Section } from '@/config/sectionFilters';
import {
  SEARCH_FILTER_KEY_SET,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';

const VALID_REVIEW_STATUSES = ['approved', 'pending', 'rejected', 'needs_revision', 'all'] as const;
export type ReviewStatus = (typeof VALID_REVIEW_STATUSES)[number];

export interface DiscoveryQuery {
  q: string;
  category: string | null;
  location: string;
  section: Section;
  filters: SearchFilterKey[] | undefined;
}

export type HalalTier = 'bronze' | 'silver' | 'gold';
const VALID_TIERS: HalalTier[] = ['bronze', 'silver', 'gold'];

export const TIER_CYCLE: ReadonlyArray<HalalTier | null> = [null, 'bronze', 'silver', 'gold'];

export function parseTier(raw: string | null): HalalTier | undefined {
  if (!raw) return undefined;
  return VALID_TIERS.includes(raw as HalalTier) ? (raw as HalalTier) : undefined;
}

export interface RouteDiscoveryQuery {
  q: string;
  category: string | null;
  location: string;
  section: Section | undefined;
  filters: SearchFilterKey[] | undefined;
  status: ReviewStatus | undefined;
  statusError: string | undefined;
  tier: HalalTier | undefined;
}

interface PathOverrides {
  city?: string | null;
  category?: string | null;
  section?: Section;
}

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

  const tier = parseTier(params.get('tier'));

  return { q, category, location, section, filters, status, statusError, tier };
}

// ── Writers ──────────────────────────────────────────────────────────────

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

export function buildTierChangeLink(currentUrl: string, tier: HalalTier | null): string {
  const [path, params] = splitUrl(currentUrl);
  if (tier) {
    params.set('tier', tier);
  } else {
    params.delete('tier');
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
  tier: HalalTier | undefined;
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

  const tier = parseTier(params.get('tier'));

  return { q, category, location, section, filters, nearMe, openNow, status, view, tier };
}
