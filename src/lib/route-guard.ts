/**
 * Issue 533 — make unknown /food slugs and /p ids answer with a real HTTP 404.
 *
 * Why this lives in middleware instead of the page
 * ------------------------------------------------
 * `notFound()` can only change the response status while the render is still
 * buffered. These routes are dynamically rendered (they export no
 * `generateStaticParams`), and the tree sits under a root `app/loading.tsx`
 * plus segment `loading.tsx` boundaries (`food/loading.tsx`,
 * `p/[id]/loading.tsx`). React flushes that shell — status line included —
 * long before the page body resolves, so Next has already written `200` by
 * the time `notFound()` throws.
 *
 * Middleware runs before any byte is written, and
 * `NextResponse.rewrite(url, { status: 404 })` lets us keep rendering the same
 * route (so the existing not-found UI still shows) while forcing the status
 * code.
 *
 * The checks below deliberately mirror `findCityBySlug` (src/lib/city-slug.ts),
 * `getCategoryBySlug` (src/services/categories.ts) and `getProviderById`
 * (src/services/providers/crud.ts), including their error handling, so the
 * status code can never disagree with the rendered body.
 *
 * This module is edge-runtime safe: it talks to PostgREST over `fetch` rather
 * than importing `@supabase/supabase-js`, which would bloat the middleware
 * bundle.
 */

import { slugify } from '@/lib/slugify';

/** How long a slug list stays cached in the middleware isolate. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Upper bound for one PostgREST lookup. The guard sits in the request path,
 * so a hung connection must fail open fast rather than stall the page load.
 * 1.5s is ~30x the measured warm median (~50ms) — generous enough that a
 * slow-but-alive Supabase still answers, tight enough to not be felt as a
 * stall on top of normal render time.
 */
const LOOKUP_TIMEOUT_MS = 1500;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const slugSetCache = new Map<string, CacheEntry<Set<string>>>();
const categoryCache = new Map<string, CacheEntry<boolean>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): T {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/** Exposed for tests; clears the module-level caches. */
export function resetRouteGuardCache(): void {
  slugSetCache.clear();
  categoryCache.clear();
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Fetch a PostgREST path. Returns `null` when the request could not be made
 * at all (missing env, network failure); callers treat that as "could not
 * determine" and must fail open.
 *
 * Always anon. The pages this guard protects run anon for every caller:
 * `createSupabaseServerClient()` reads the `sb-auth-token` cookie, which no
 * code path writes (auth flows through the custom `sb-access-token` cookie
 * instead, and the browser uses a plain `createClient`). Forwarding a caller
 * token here would make the guard see MORE rows than the page renders —
 * an owner opening their own unapproved `/p/<id>` would pass the guard and
 * then hit the page's `notFound()`, reproducing the soft-404 this module
 * exists to kill.
 */
async function postgrestFetch(path: string): Promise<Response | null> {
  const env = supabaseEnv();
  if (!env) return null;

  return fetch(`${env.url}/rest/v1/${path}`, {
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
}

interface PostgrestResult<T> {
  rows: T[];
  /**
   * True when `rows` was derived from a non-OK response rather than a real
   * query result. Only reachable via `errorAsEmpty`. A degraded answer may be
   * returned but must never be cached — it would outlive the fault.
   */
  degraded: boolean;
}

/**
 * `null` means "could not determine" — missing env, network failure, abort
 * timeout, or a non-OK PostgREST response. Callers must fail open and must
 * NOT cache the result: a guard that cannot reach the database lets the
 * request through, and a cached "unknown" would pin a dependency blip into
 * the 5-minute TTL.
 *
 * `errorAsEmpty` opts into the opposite mapping for lookups whose page-side
 * service swallows query errors into `notFound()` (`getCategoryBySlug`
 * does): an HTTP error then means "not found" instead of "unknown", so the
 * status code and the rendered body still agree. The result is flagged
 * `degraded` so the caller can return it without caching it.
 */
async function postgrest<T>(
  path: string,
  opts?: { errorAsEmpty?: boolean },
): Promise<PostgrestResult<T> | null> {
  let res: Response | null;
  try {
    res = await postgrestFetch(path);
  } catch {
    return null;
  }
  if (!res) return null;
  if (!res.ok) return opts?.errorAsEmpty ? { rows: [], degraded: true } : null;

  return { rows: (await res.json()) as T[], degraded: false };
}

async function citySlugsFromCitiesTable(): Promise<Set<string> | null> {
  const cached = readCache(slugSetCache, 'cities');
  if (cached !== undefined) return cached;

  const result = await postgrest<{ city_name: string }>('cities?select=city_name&limit=500');
  // "Unknown" is never written to the cache — the next request retries.
  if (result === null) return null;

  const slugs = new Set(result.rows.map((row) => slugify(row.city_name)));
  return writeCache(slugSetCache, 'cities', slugs);
}

async function citySlugsFromProviders(): Promise<Set<string> | null> {
  const cached = readCache(slugSetCache, 'providers');
  if (cached !== undefined) return cached;

  const result = await postgrest<{ address_city: string | null }>(
    'providers?select=address_city&review_status=eq.approved&address_city=not.is.null',
  );
  if (result === null) return null;

  const slugs = new Set(
    result.rows
      .map((row) => row.address_city)
      .filter((city): city is string => Boolean(city))
      .map(slugify),
  );
  return writeCache(slugSetCache, 'providers', slugs);
}

async function isKnownCitySlug(citySlug: string): Promise<boolean | null> {
  const fromCities = await citySlugsFromCitiesTable();
  if (fromCities === null) return null;
  if (fromCities.has(citySlug)) return true;

  // Mirrors the provider-city fallback in findCityBySlug.
  const fromProviders = await citySlugsFromProviders();
  if (fromProviders === null) return null;
  return fromProviders.has(citySlug);
}

async function isKnownFoodCategorySlug(categorySlug: string): Promise<boolean | null> {
  const cached = readCache(categoryCache, categorySlug);
  if (cached !== undefined) return cached;

  const result = await postgrest<{ category_id: string }>(
    `categories?select=category_id&slug=eq.${encodeURIComponent(categorySlug)}` +
      '&applicable_section=in.(food,all)&limit=1',
    // getCategoryBySlug swallows query errors into notFound(), so an HTTP
    // error here means "not found" — matching the body the page renders.
    { errorAsEmpty: true },
  );
  if (result === null) return null;
  // A degraded not-found (HTTP error, not a real empty result) is returned
  // but not cached: it must not outlive the fault that produced it.
  if (result.degraded) return false;

  return writeCache(categoryCache, categorySlug, result.rows.length > 0);
}

export interface FoodRouteParams {
  citySlug: string;
  categorySlug?: string;
}

/**
 * Matches exactly the two routes that call `notFound()` on a bad slug:
 * `/food/[city]` and `/food/[city]/[category]`.
 */
export function parseFoodRoute(pathname: string): FoodRouteParams | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'food') return null;

  if (segments.length === 2) {
    return { citySlug: decodeURIComponent(segments[1]) };
  }
  if (segments.length === 3) {
    return {
      citySlug: decodeURIComponent(segments[1]),
      categorySlug: decodeURIComponent(segments[2]),
    };
  }
  return null;
}

export interface ProviderRouteParams {
  providerId: string;
}

/** Matches `/p/[id]` — exactly two segments. */
export function parseProviderRoute(pathname: string): ProviderRouteParams | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 2 && segments[0] === 'p') {
    return { providerId: decodeURIComponent(segments[1]) };
  }
  return null;
}

/**
 * Per-id existence check for `/p/[id]`. Provider ids are an unbounded UUID
 * space, so unlike the city slug sets this is NOT cached as a list — one
 * `select=provider_id&limit=1` lookup per request.
 *
 * `null` means "could not determine" — the caller fails open. A non-OK
 * PostgREST response is also `null`, not "missing": `getProviderById` throws
 * on any error other than PGRST116, so a failed query means the page renders
 * an error, not the not-found UI.
 */
async function providerExists(providerId: string): Promise<boolean | null> {
  let res: Response | null;
  try {
    res = await postgrestFetch(
      `providers?select=provider_id&provider_id=eq.${encodeURIComponent(providerId)}&limit=1`,
    );
  } catch {
    return null;
  }
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as { provider_id: string }[];
  return rows.length > 0;
}

/**
 * True when `/food/<city>` or `/food/<city>/<category>` should be answered
 * with a 404 status. Fails open whenever validity cannot be established, so a
 * transient Supabase outage can never take the whole /food section down.
 */
export async function shouldServeFoodNotFound(pathname: string): Promise<boolean> {
  const route = parseFoodRoute(pathname);
  if (!route) return false;

  try {
    const cityKnown = await isKnownCitySlug(route.citySlug);
    if (cityKnown === null) return false;
    if (!cityKnown) return true;

    if (route.categorySlug === undefined) return false;

    const categoryKnown = await isKnownFoodCategorySlug(route.categorySlug);
    if (categoryKnown === null) return false;
    return !categoryKnown;
  } catch {
    // Network/DNS failure — fail open.
    return false;
  }
}

/**
 * True when `/p/<id>` should be answered with a 404 status. Fails open so a
 * Supabase blip cannot 404 a working provider page.
 */
export async function shouldServeProviderNotFound(pathname: string): Promise<boolean> {
  const route = parseProviderRoute(pathname);
  if (!route) return false;

  try {
    const exists = await providerExists(route.providerId);
    if (exists === null) return false;
    return !exists;
  } catch {
    return false;
  }
}

/**
 * Single entry point for middleware: true when this pathname should be
 * answered with a 404 status regardless of what the streamed body renders.
 */
export async function shouldServeNotFound(pathname: string): Promise<boolean> {
  if (await shouldServeFoodNotFound(pathname)) return true;
  return shouldServeProviderNotFound(pathname);
}
