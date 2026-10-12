import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProviderFormData } from '@/providers/form-provider';
import { TrustLevel } from '@/types/badges';
import { makeProviderKey } from '@/lib/import/joinhalal';
import { CITY_ALIASES } from '@/lib/enrichment/delivery-platform/city-coords';
import { lookupCanonicalCity } from './city-geocode.server';
import type { CreateProviderResult } from './mutations';

/** ProviderFormData minus File fields, plus already-uploaded public image URLs. */
export type CreateProviderPayload = Omit<ProviderFormData, 'images' | 'certificate_file'> & {
  imageUrls?: string[];
  /** Server-set marker (#606): which endpoint accepted the submission. The
   * route overwrites whatever the body carried — /api/providers/recommend
   * sets 'recommend' (closed city list), all other routes clear it. */
  submissionSource?: 'recommend' | 'import' | 'owner';
};

/** Error codes the /api/providers route maps to statuses and the client maps
 * to localised copy. Opaque by contract (#577/#582): never leak internals. */
export type ProviderSubmitErrorCode =
  | 'CATEGORY_UNKNOWN'
  | 'CITY_NOT_SUPPORTED'
  | 'HALAL_ATTESTATION_REQUIRED'
  | 'PROVIDER_DUPLICATE';

export interface DuplicateProviderMatch {
  /** Only ever set for approved matches. A pending row is RLS-invisible to
   * non-creators (migration 137), so its id, stored name and city must not
   * leak through this API — pending matches return `status` only. */
  provider_id?: string;
  name?: string;
  city?: string;
  status: 'approved' | 'pending';
  /** Public detail link — only ever set for approved providers. A pending
   * row has no public page, and a rejected row is never revealed at all. */
  href?: string;
}

export class ProviderSubmitError extends Error {
  constructor(
    public readonly code: ProviderSubmitErrorCode,
    message: string,
    public readonly extras?: { existing?: DuplicateProviderMatch },
  ) {
    super(message);
    this.name = 'ProviderSubmitError';
  }
}

export interface CreateProviderActor {
  /** Resolved from the server-side session; the route rejects anonymous
   * requests, so this is always a real user id. */
  userId: string;
  /** true only when creationMode === 'owner'. */
  isOwner: boolean;
}

export interface CreateProviderServerInput {
  formData: CreateProviderPayload;
  actor: CreateProviderActor;
}

type AdminClient = SupabaseClient;

async function createPrimaryLocation(
  admin: AdminClient,
  providerId: string,
  formData: CreateProviderPayload,
): Promise<void> {
  const { error: locationError } = await admin.from('locations').insert([
    {
      provider_id: providerId,
      location_name: null,
      address_street: formData.isOnlineBusiness ? null : formData.street || null,
      address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
      address_city: formData.isOnlineBusiness ? null : formData.city || null,
      address_country: formData.isOnlineBusiness ? null : formData.country || null,
      location_latitude: formData.isOnlineBusiness ? null : (formData.latitude ?? null),
      location_longitude: formData.isOnlineBusiness ? null : (formData.longitude ?? null),
      show_address: formData.isOnlineBusiness
        ? false
        : formData.showAddress !== undefined
          ? formData.showAddress
          : true,
      contact_phone: formData.phone || null,
      is_primary: true,
    },
  ]);

  if (locationError) {
    console.error('Error creating primary location:', locationError);
    throw locationError;
  }
}

async function syncEntityRelations(
  admin: AdminClient,
  table:
    'provider_offers' | 'provider_needs' | 'community_service_offers' | 'community_service_needs',
  entityColumn: 'provider_id',
  relationColumn: 'offer_id' | 'need_id',
  entityId: string,
  relationIds: string[],
): Promise<void> {
  const { error: deleteError } = await admin.from(table).delete().eq(entityColumn, entityId);

  if (deleteError) {
    throw deleteError;
  }

  if (relationIds.length === 0) {
    return;
  }

  const rows = relationIds.map((relationId) => ({
    [entityColumn]: entityId,
    [relationColumn]: relationId,
  }));

  const { error: insertError } = await admin.from(table).insert(rows);
  if (insertError) {
    throw insertError;
  }
}

type ListingType = 'food' | 'store' | 'ummah';

/**
 * Fallback for categories whose live `applicable_section` cannot be mapped to
 * a listing type ('all', the schema default, lands here). Keyed off the
 * category `slug` — the one stable identifier across environments, since
 * category ids diverge between prod, dev and local. Values measured from 569
 * existing prod providers on these categories (#606 gate decision).
 * German-slug aliases cover environments where `slug` was never backfilled.
 */
const UNMAPPED_SECTION_CATEGORY_LISTING: Record<string, ListingType> = {
  'food-drink': 'food',
  'essen-trinken': 'food',
  'crafts-repair': 'store',
  'handwerk-reparatur': 'store',
  education: 'store',
  'bildung-lernen': 'store',
  other: 'food',
  sonstiges: 'food',
  services: 'store',
  dienstleistungen: 'store',
  'community-support': 'ummah',
  'gemeinschaft-spenden': 'ummah',
};

/** Same slug recipe as migration 125: lowercase, umlauts expanded, runs of
 * non-alphanumerics collapsed to '-'. */
function slugifyCategoryName(name: string): string {
  return name
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves providers.listing_type (NOT NULL, no default) for a category.
 * Chain (#606): live applicable_section → slug-keyed fallback map → 'food'
 * (the recommend form only asks halal-food questions; 448 of 497 prod rows
 * on unmappable categories were food anyway).
 *
 * Returns 'category_not_found' only when the category row does not exist —
 * that is caller-visible bad input (400), while every existing category must
 * resolve to a real listing type and never throw.
 */
async function resolveListingType(
  admin: AdminClient,
  categoryId: string,
): Promise<ListingType | 'category_not_found'> {
  if (!categoryId) return 'category_not_found';
  const { data, error } = await admin
    .from('categories')
    .select('applicable_section, slug, name_en, name_de')
    .eq('category_id', categoryId)
    .single();

  if (error || !data) {
    // PostgREST reports an empty .single() result as PGRST116; anything else
    // is a real infrastructure failure and must surface as a 500, not a 400.
    if (error && error.code !== 'PGRST116') throw error;
    return 'category_not_found';
  }

  if (['food', 'store', 'ummah'].includes(data.applicable_section)) {
    return data.applicable_section as ListingType;
  }

  const slugCandidates = [data.slug, data.name_en, data.name_de]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => slugifyCategoryName(v));
  for (const candidate of slugCandidates) {
    const mapped = UNMAPPED_SECTION_CATEGORY_LISTING[candidate];
    if (mapped) return mapped;
  }

  console.warn({
    event: 'listing_type_defaulted',
    category_id: categoryId,
    applicable_section: data.applicable_section,
  });
  return 'food';
}

/** Folds diacritics (ä→a, é→e, ß→ss) so 'München' and 'munchen' compare
 * equal in duplicate and city lookups. */
function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss');
}

/** R1 normalisation (#606): lowercase, diacritic strip, punctuation
 * collapse. Deliberately not provider-matcher's normalizeName — its legal-
 * suffix stripping ('X restaurant' → 'x') is asymmetric with punctuation
 * variants ('X restaurant!' → 'x restaurant') and would miss true dupes. */
function normalizeForDuplicate(value: string): string {
  return stripDiacritics(value.trim().toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** R1 identity (#606): normalised provider name AND normalised city, both
 * exact after normalisation. The city side runs through the alias map on
 * BOTH sides of the comparison — the catalog seeds exonym pairs (Munich /
 * München, Cologne / Köln, Hanover / Hannover, Nuremberg / Nürnberg) and
 * diacritic folding alone never equates them. */
function duplicateKey(name: string, city: string): string {
  return makeProviderKey(
    normalizeForDuplicate(name),
    normalizeForDuplicate(canonicalizeViaAliases(city)),
  );
}

/** Page size for the keyset scan. Matches PostgREST max_rows
 * (supabase/config.toml) today, but correctness does not depend on it —
 * see the loop below. */
const DUPLICATE_SCAN_PAGE = 1000;

/**
 * Blocks a submission whose normalised name+city already exists on a
 * provider visible as a duplicate (#606, rule R1 — measured on prod: every
 * sampled match was a true duplicate).
 *
 * The scan reads the whole approved+pending set in pages: PostgREST caps a
 * single response at max_rows, and prod has more pending rows than that,
 * so an un-paginated scan silently checks an arbitrary subset. The paging
 * is KEYSET (`.gt(provider_id, lastSeen)` + `.limit`), not offset-based:
 * if the server ever caps responses below the requested window, an offset
 * scan would skip the unreturned rows mid-scan and silently truncate again.
 * Keyset pages are contiguous at any cap ≥ 1; the loop stops only on an
 * empty page.
 *
 * Visibility follows provider_is_visible (migration 137): an approved match
 * may be linked; a pending match is only "already recommended, under
 * review"; a rejected provider is never revealed — it does not match at all.
 */
async function assertNoDuplicateProvider(
  admin: AdminClient,
  formData: CreateProviderPayload,
): Promise<void> {
  const submittedCity = (formData.city ?? '').trim();
  if (!submittedCity || !formData.title?.trim()) return;

  const submittedKey = duplicateKey(formData.title, submittedCity);
  let pendingMatch = false;
  let lastProviderId = '00000000-0000-0000-0000-000000000000';

  for (;;) {
    const { data: rows, error } = await admin
      .from('providers')
      .select('provider_id, provider_name, address_city, review_status')
      .not('address_city', 'is', null)
      .in('review_status', ['approved', 'pending'])
      .gt('provider_id', lastProviderId)
      .order('provider_id', { ascending: true })
      .limit(DUPLICATE_SCAN_PAGE);
    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      if (!row.provider_name || !row.address_city) continue;
      // Re-checked row-side even though the query filters review_status:
      // the predicate narrows the scan, the rule lives here.
      if (row.review_status !== 'approved' && row.review_status !== 'pending') continue;
      if (duplicateKey(row.provider_name, row.address_city) !== submittedKey) continue;

      if (row.review_status === 'approved') {
        throw new ProviderSubmitError('PROVIDER_DUPLICATE', 'Duplicate provider submission', {
          existing: {
            provider_id: row.provider_id,
            name: row.provider_name,
            city: row.address_city,
            status: 'approved',
            href: `/p/${row.provider_id}`,
          },
        });
      }
      pendingMatch = true;
    }

    lastProviderId = rows[rows.length - 1].provider_id;
  }

  if (pendingMatch) {
    throw new ProviderSubmitError('PROVIDER_DUPLICATE', 'Duplicate provider submission', {
      // A pending row is invisible to this caller under RLS. Disclose only
      // that a matching recommendation is under review — never its id,
      // stored name or a link that would 404 anyway.
      existing: { status: 'pending' },
    });
  }
}

/** Fail-open canonicalisation (#606): resolve the typed value through the
 * alias map (exact key, then diacritic-folded case-insensitive) so known
 * variants store canonically even when the geocoder cannot run. */
function canonicalizeViaAliases(city: string): string {
  const direct = CITY_ALIASES[city];
  if (direct) return direct;
  const folded = stripDiacritics(city.toLowerCase());
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (stripDiacritics(alias.toLowerCase()) === folded) return canonical;
  }
  return city;
}

/**
 * Shared closed-city accept chain (#606): never stores an unvalidated
 * free-text city, and never blocks a user whose town is missing from the
 * `cities` catalog.
 *   1. canonicalised catalog match — returns the catalog `city_name`;
 *   2. else the server-side geocoder resolves the value — the canonical
 *      name it returns is used (and goes through the same R1 duplicate
 *      normalisation, so a resolved name and a catalog name for the same
 *      town still collide);
 *   3. else CITY_NOT_SUPPORTED — only for a lookup that ran and matched
 *      nothing. A geocoder outage (`unavailable`) fails OPEN, settled at
 *      the gate: blocking submissions on an external service is the exact
 *      failure class this issue is about, and pending human review is the
 *      backstop. The typed value is stored alias-canonicalised. Fallback
 *      cities land on the provider only — the catalog stays curated.
 * Callers: the recommend path (canonicalizeRecommendCity below) and the
 * chat register_provider tool.
 */
export async function resolveSubmissionCity(
  admin: AdminClient,
  submittedCity: string,
): Promise<string> {
  const { data: rows, error } = await admin.from('cities').select('city_name');
  if (error) throw error;

  const submittedNorm = stripDiacritics(submittedCity.toLowerCase());
  const match = (rows ?? []).find(
    (row: { city_name: string }) => stripDiacritics(row.city_name.toLowerCase()) === submittedNorm,
  );
  if (match) return match.city_name;

  const geocode = await lookupCanonicalCity(submittedCity);
  if (geocode.kind === 'resolved') return geocode.canonicalName;
  if (geocode.kind === 'unavailable') {
    console.warn({
      event: 'city_geocode_unavailable',
      submitted_city: submittedCity,
    });
    return canonicalizeViaAliases(submittedCity);
  }
  throw new ProviderSubmitError(
    'CITY_NOT_SUPPORTED',
    'Recommend submission rejected: city could not be resolved',
  );
}

/** The recommend path enforces the closed city list. The caller decides:
 * `formData.submissionSource` is set by the route, never trusted from the
 * request body (#606 review) — /api/providers/recommend sets 'recommend',
 * every other caller leaves it unset and keeps free-text cities. */
async function canonicalizeRecommendCity(
  admin: AdminClient,
  formData: CreateProviderPayload,
): Promise<void> {
  if (formData.submissionSource !== 'recommend') return;
  const submittedCity = (formData.city ?? '').trim();
  if (!submittedCity) return;
  formData.city = await resolveSubmissionCity(admin, submittedCity);
}

const TAG_SYNONYMS = {
  muslim: new Set(['muslim', 'muslim_owned', 'muslim-owned']),
  prayer: new Set([
    'gebet',
    'gebetsraum',
    'gebetsfreundlich',
    'prayer',
    'prayer_space',
    'prayer-friendly',
  ]),
  donations: new Set([
    'spenden',
    'spendenbereit',
    'makes_donations',
    'supports_sadaqah',
    'sadaqah',
  ]),
  parking: new Set(['parken', 'parking', 'has_parking']),
  solidarity: new Set(['solidaritaet', 'solidarity', 'economic_solidarity']),
} as const;

const FORM_TAG_TO_BADGE_KEY = {
  muslim: 'MUSLIM_OWNED',
  prayer: 'PRAYER_FRIENDLY',
  donations: 'SUPPORTS_SADAQAH',
  parking: 'HAS_PARKING',
  solidarity: 'ECONOMIC_SOLIDARITY',
} as const;

/**
 * Creates a provider or community service from form data. All writes go
 * through the service-role client: anon RLS policies only allow the providers
 * insert, so child-table writes (locations, provider_offers, provider_needs,
 * extension tables, badges) cannot run from the browser.
 *
 * After the providers insert succeeds, any failure of a required child write
 * deletes the provider row so a failed submission never leaves an orphan
 * pending provider with no location.
 *
 * @param input.formData - Form data with uploaded public image URLs
 * @param input.actor - Session-derived actor; ownership fields are never taken
 *   from the request body
 * @returns The created entity ID (provider_id or community_service_id)
 */
export async function createProviderOrServiceServer(
  input: CreateProviderServerInput,
): Promise<CreateProviderResult> {
  const { formData, actor } = input;
  const admin = getSupabaseAdmin();
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
  const uploadedUrls = formData.imageUrls ?? [];

  // #606: recommend-path submissions take their city from the closed cities
  // list (canonicalised to the stored spelling), then rule R1 blocks exact
  // normalised name+city duplicates. Both run before any insert.
  await canonicalizeRecommendCity(admin, formData);
  await assertNoDuplicateProvider(admin, formData);

  /**
   * Removes a provider row after a required child write failed. When the
   * delete itself fails, throws a loud error naming the orphan id so the row
   * can be cleaned up manually (the H4 regression contract).
   */
  const cleanupOrphan = async (providerId: string, cause: unknown) => {
    const causeMessage = (cause as { message?: string })?.message ?? String(cause);
    const { error: cleanupError } = await admin
      .from('providers')
      .delete()
      .eq('provider_id', providerId);
    if (cleanupError) {
      console.error('Failed to clean up provider after child write failure:', cleanupError);
      throw new Error(
        `Provider creation failed (${causeMessage}) and cleanup of orphaned provider '${providerId}' also failed (${cleanupError.message}). The provider row requires manual removal.`,
      );
    }
  };

  if (isCommunityService) {
    // M-5a: community_services table dropped — ummah providers created in providers table
    const generatedServiceId = crypto.randomUUID();

    const insertData: Record<string, unknown> = {
      provider_id: generatedServiceId,
      listing_type: 'ummah',
      provider_name: formData.title,
      provider_description: formData.description || null,
      address_street: formData.isOnlineBusiness ? null : formData.street || null,
      address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
      address_city: formData.isOnlineBusiness ? null : formData.city || null,
      address_country: formData.isOnlineBusiness ? null : formData.country || null,
      show_address: formData.isOnlineBusiness
        ? false
        : formData.showAddress !== undefined
          ? formData.showAddress
          : true,
      category_id: formData.category || null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      provider_images: uploadedUrls.length > 0 ? uploadedUrls : null,
      review_status: 'pending' as const,
      user_created_id: actor.userId,
    };

    const { error: serviceError } = await admin.from('providers').insert([insertData]);

    if (serviceError) {
      console.error('Error creating ummah provider:', serviceError);
      throw serviceError;
    }

    try {
      await Promise.all([
        syncEntityRelations(
          admin,
          'provider_offers',
          'provider_id',
          'offer_id',
          generatedServiceId,
          formData.offers_ids || [],
        ),
        syncEntityRelations(
          admin,
          'provider_needs',
          'provider_id',
          'need_id',
          generatedServiceId,
          formData.needs_ids || [],
        ),
        createPrimaryLocation(admin, generatedServiceId, formData),
      ]);
    } catch (childError) {
      await cleanupOrphan(generatedServiceId, childError);
      throw childError;
    }

    return { community_service_id: generatedServiceId };
  }

  // Create provider
  // Generate UUID client-side to avoid needing SELECT after INSERT
  // This bypasses the SELECT policy issue for pending reviews
  const generatedProviderId = crypto.randomUUID();

  // providers.listing_type is NOT NULL with no default; it must be resolved
  // before the insert, not after it.
  const resolvedListingType = await resolveListingType(admin, formData.category);
  if (resolvedListingType === 'category_not_found') {
    throw new ProviderSubmitError(
      'CATEGORY_UNKNOWN',
      `Provider submission rejected: category '${formData.category}' does not exist.`,
    );
  }

  // Defence in depth (#415): food/store submissions must carry a deliberate
  // answer on all three halal attestations — true (yes), false (no), or
  // explicit null ("not sure"); undefined means the question was never
  // answered. Ummah/community-service submissions have no halal questions
  // and are exempt.
  if (
    (resolvedListingType === 'food' || resolvedListingType === 'store') &&
    [formData.no_alcohol, formData.no_pork, formData.no_gambling].some(
      (answer) => answer === undefined,
    )
  ) {
    throw new ProviderSubmitError(
      'HALAL_ATTESTATION_REQUIRED',
      'Halal attestation required: all three questions must be answered (yes, no, or not sure).',
    );
  }

  const normalizedTags = new Set(
    (formData.tags || []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
  );

  const hasMuslimOwnedTag = Array.from(TAG_SYNONYMS.muslim).some((tag) => normalizedTags.has(tag));
  const hasPrayerTag = Array.from(TAG_SYNONYMS.prayer).some((tag) => normalizedTags.has(tag));
  const hasDonationsTag = Array.from(TAG_SYNONYMS.donations).some((tag) => normalizedTags.has(tag));
  const hasParkingTag = Array.from(TAG_SYNONYMS.parking).some((tag) => normalizedTags.has(tag));
  const hasSolidarityTag = Array.from(TAG_SYNONYMS.solidarity).some((tag) =>
    normalizedTags.has(tag),
  );

  const requestedBadgeKeys: string[] = [];
  if (hasMuslimOwnedTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.muslim);
  if (hasPrayerTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.prayer);
  if (hasDonationsTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.donations);
  if (hasParkingTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.parking);
  if (hasSolidarityTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.solidarity);

  const insertData: Record<string, unknown> = {
    provider_id: generatedProviderId,
    listing_type: resolvedListingType,
    provider_name: formData.title,
    // If online business, all address fields are null
    address_street: formData.isOnlineBusiness ? null : formData.street || null,
    address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
    address_city: formData.isOnlineBusiness ? null : formData.city || null,
    address_country: formData.isOnlineBusiness ? null : formData.country || null,
    show_address: formData.isOnlineBusiness
      ? false
      : formData.showAddress !== undefined
        ? formData.showAddress
        : true,
    category_id: formData.category || null,
    contact_email: formData.email || null,
    contact_phone: formData.phone || null,
    social_website: formData.website || null,
    social_instagram: formData.instagram || null,
    provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
    review_status: 'pending' as const, // Providers need review
  };

  // Ownership fields come from the session-derived actor, never the request
  // body: provider_owner_id is only set for owner submissions.
  Object.assign(insertData, {
    user_created_id: actor.userId,
    provider_owner_id: actor.isOwner ? actor.userId : null,
  });

  // Insert without SELECT to avoid SELECT policy blocking pending reviews
  const { error: providerError } = await admin.from('providers').insert([insertData]);

  if (providerError) {
    console.error('Error creating provider:', providerError);
    throw providerError;
  }

  try {
    await Promise.all([
      syncEntityRelations(
        admin,
        'provider_offers',
        'provider_id',
        'offer_id',
        generatedProviderId,
        formData.offers_ids || [],
      ),
      syncEntityRelations(
        admin,
        'provider_needs',
        'provider_id',
        'need_id',
        generatedProviderId,
        formData.needs_ids || [],
      ),
      createPrimaryLocation(admin, generatedProviderId, formData),
    ]);

    // Save halal attestation data to the extension table in the same logical
    // operation. The 228 halal gate treats a missing extension row as
    // all-attestations-missing, so a food/store provider without one can never
    // be approved — failure here must not be swallowed.
    if (resolvedListingType === 'food' || resolvedListingType === 'store') {
      const extTable = resolvedListingType === 'food' ? 'food_providers' : 'store_providers';
      // The certificate is uploaded client-side before submission;
      // certificate_url arrives as a public storage URL or empty.
      const certificateUrl = formData.certificate_url || null;
      const extPayload: Record<string, unknown> = {
        provider_id: generatedProviderId,
        // Tri-state (#415): true=yes, false=submitter said no, null=not sure.
        // NULL must survive so reviewers can triage "no" vs "unknown".
        no_alcohol: formData.no_alcohol ?? null,
        no_pork: formData.no_pork ?? null,
        no_gambling: formData.no_gambling ?? null,
        // verification_method is TEXT NOT NULL DEFAULT 'online' with
        // CHECK (... IN ('online','onsite')) — the 'online' fallback is a
        // schema default and carries no verification claim (computeSealTier
        // requires a truthy attestation before awarding a tier anyway).
        verification_method: formData.verification_method || 'online',
        // AC6.8: has_certificate is only written when a certificate URL
        // actually exists — a bare toggle must never produce a gold tier.
        has_certificate: certificateUrl != null,
        certificate_url: certificateUrl,
      };
      const { error: extError } = await admin
        .from(extTable)
        .upsert(extPayload, { onConflict: 'provider_id' });
      if (extError) {
        console.error('Error saving halal data:', extError);
        throw extError;
      }
    }
  } catch (childError) {
    // Required child write failed: remove the provider so it cannot sit
    // pending forever without a location or extension row.
    await cleanupOrphan(generatedProviderId, childError);
    throw childError;
  }

  if (requestedBadgeKeys.length > 0) {
    const { data: badgeTypes, error: badgeTypesError } = await admin
      .from('badge_types')
      .select('id, badge_key')
      .in('badge_key', requestedBadgeKeys);

    let badgeInsertFailed = false;

    if (badgeTypesError) {
      badgeInsertFailed = true;
      console.error('Error fetching badge types for provider creation:', badgeTypesError);
    } else if (badgeTypes && badgeTypes.length > 0) {
      const badgeRows = badgeTypes.map((badgeType) => ({
        provider_id: generatedProviderId,
        community_service_id: null,
        badge_type_id: badgeType.id,
        trust_level: TrustLevel.SELF_DECLARED,
        confirmation_count: 0,
      }));

      const { error: providerBadgesError } = await admin.from('provider_badges').insert(badgeRows);

      if (providerBadgesError) {
        badgeInsertFailed = true;
        console.error(
          'Error creating provider badges during provider creation:',
          providerBadgesError,
        );
      }
    }

    if (badgeInsertFailed) {
      const fallbackBooleans: Record<string, boolean> = {};
      if (hasMuslimOwnedTag) fallbackBooleans.muslim_owned = true;
      if (hasPrayerTag) fallbackBooleans.has_prayer_space = true;
      if (hasDonationsTag) fallbackBooleans.makes_donations = true;
      if (hasParkingTag) fallbackBooleans.has_parking = true;
      if (hasSolidarityTag) fallbackBooleans.economic_solidarity = true;

      if (Object.keys(fallbackBooleans).length > 0) {
        const { error: fallbackError } = await admin
          .from('providers')
          .update(fallbackBooleans)
          .eq('provider_id', generatedProviderId);

        if (fallbackError) {
          console.error(
            'Error applying fallback provider booleans after badge insert failure:',
            fallbackError,
          );
        }
      }
    }
  }

  // Create provider-community service relationships for all selected services
  if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
    for (const serviceId of formData.selectedCommunityServiceIds) {
      // Insert directly with the admin client: the shared helper in
      // communityServices.ts uses the browser client, which has no session
      // server-side and would be RLS-blocked.
      const { error: relationshipError } = await admin.from('provider_engagements').insert({
        initiating_provider_id: generatedProviderId,
        engaged_provider_id: serviceId,
      });
      if (relationshipError) {
        console.error('Error creating provider engagement:', relationshipError);
        // non-fatal: the provider was created successfully
      }
    }
  }

  return { provider_id: generatedProviderId };
}
