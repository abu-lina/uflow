import { SECTION_META } from '@/config/sectionFilters';
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
