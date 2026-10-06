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
 * The checks below mirror `findCityBySlug` (src/lib/city-slug.ts),
 * `getCategoryBySlug` (src/services/categories.ts) and `getProviderById`
 * (src/services/providers/crud.ts) on RESULTS — the same slug sets, the same
 * id existence check. They deliberately diverge on ERRORS: a lookup that
 * cannot be completed (non-OK response, timeout, network failure) means
 * "could not determine" and lets the request through, so during a Supabase
 * outage the status (200) intentionally disagrees with the body (the page's
 * soft-404 render). That disagreement is the trade, on purpose: a soft 404
 * is a cosmetic bug, while a hard 404 invented from a dependency blip turns
 * it into a site-wide outage. Do not "restore consistency" here.
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
 * `accessToken` is the caller's session token (the custom httpOnly
 * `sb-access-token` cookie — the @supabase/ssr cookie the SSR client reads
 * is never written). When set, the request runs as the caller, so RLS and
 * `auth.uid()` resolve to them. Omit it and the request runs as anon.
 */
async function postgrestFetch(path: string, accessToken?: string): Promise<Response | null> {
  const env = supabaseEnv();
  if (!env) return null;

  return fetch(`${env.url}/rest/v1/${path}`, {
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${accessToken ?? env.key}`,
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
    // That mapping is load-bearing only because of a schema gap, not a
    // permanent design choice: `categories.slug` does not exist in this
    // database today (PostgREST answers 400 42703), so getCategoryBySlug
    // returns null for every slug and every category page genuinely renders
    // not-found. Failing open here would restore soft-404s on every
    // category URL. The degraded answer is returned but never cached, so it
    // cannot outlive the fault. When #246's `slug` column lands, remove
    // `errorAsEmpty`: from then on a categories 5xx is "could not
    // determine" and must fail open like the city lookups.
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

/** UUID shape for `/p/<id>`. Anything else 404s without a database round trip. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Per-id existence check for `/p/[id]`, run as anon. Anon RLS on
 * `providers` exposes exactly the `review_status='approved'` rows, so a
 * `true` here means "approved — visible to everyone" and a `false` means
 * "absent OR hidden from the public" — pending/rejected rows are
 * indistinguishable from nonexistent ones at this step. The caller-aware
 * RPC below resolves that second case.
 *
 * Provider ids are an unbounded UUID space, so unlike the city slug sets
 * this is NOT cached as a list — one `select=provider_id&limit=1` lookup
 * per request.
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

type RouteVisibility = 'visible' | 'hidden' | 'absent';

/**
 * Caller-aware visibility for `/p/[id]`, via the `provider_route_visibility`
 * RPC (migration 137). The RPC is `security definer` and returns one of
 * 'visible' | 'hidden' | 'absent' — never row data — applying the same
 * `provider_is_visible` predicate the providers SELECT policy uses, so the
 * guard and the page cannot disagree about who may see a row.
 *
 * The caller's access token becomes the request bearer, so `auth.uid()`
 * inside the RPC resolves to the caller: a creator or admin gets 'visible'
 * for a pending/rejected row, everyone else gets 'hidden'.
 *
 * `null` means "could not determine" — missing env, network failure,
 * timeout, a non-OK response, or a body that is not one of the three known
 * strings. Callers must fail open.
 */
async function providerRouteVisibility(
  providerId: string,
  accessToken: string,
): Promise<RouteVisibility | null> {
  const env = supabaseEnv();
  if (!env) return null;

  let res: Response;
  try {
    res = await fetch(`${env.url}/rest/v1/rpc/provider_route_visibility`, {
      method: 'POST',
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ p_provider_id: providerId }),
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  try {
    const value: unknown = await res.json();
    if (value === 'visible' || value === 'hidden' || value === 'absent') return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * True when `/p/<id>` should be answered with a 404 status for THIS caller.
 * `callerAccessToken` is the request's `sb-access-token` cookie, when present.
 *
 * Order of decisions:
 *   1. Non-UUID id -> 404. No round trip: a Postgres cast error must never
 *      reach the fail-open path and masquerade as an infrastructure blip.
 *   2. Anon existence check finds the row -> approved -> 200 for everyone.
 *   3. Anon finds nothing and there is no session -> 404. Absent and
 *      hidden-from-public are the same answer for an anonymous caller.
 *   4. Anon finds nothing but a session exists -> the visibility RPC decides:
 *      'hidden' and 'absent' are a 404 indistinguishable from a nonexistent
 *      id; 'visible' passes.
 *
 * Fails open so a Supabase blip cannot 404 a working provider page.
 */
export async function shouldServeProviderNotFound(
  pathname: string,
  callerAccessToken?: string,
): Promise<boolean> {
  const route = parseProviderRoute(pathname);
  if (!route) return false;
  if (!UUID_RE.test(route.providerId)) return true;

  try {
    const exists = await providerExists(route.providerId);
    if (exists === null) return false; // could not determine — fail open
    if (exists) return false; // approved: visible to every caller

    if (!callerAccessToken) return true; // anon sees approved rows only

    const visibility = await providerRouteVisibility(route.providerId, callerAccessToken);
    if (visibility === null) return false; // could not determine — fail open
    return visibility !== 'visible';
  } catch {
    return false;
  }
}

/**
 * Single entry point for middleware: true when this pathname should be
 * answered with a 404 status regardless of what the streamed body renders.
 * `callerAccessToken` only matters for `/p/<uuid>`: it is the one route
 * whose answer depends on who asks.
 */
export async function shouldServeNotFound(
  pathname: string,
  callerAccessToken?: string,
): Promise<boolean> {
  if (await shouldServeFoodNotFound(pathname)) return true;
  return shouldServeProviderNotFound(pathname, callerAccessToken);
}
