/**
 * Pure utility functions for the enrichment backfill script.
 *
 * These detect broken data formats and transform them into the
 * canonical OpeningHours shape expected by the UI.
 *
 * No side effects, no database access, no network calls.
 */

import type { OpeningHours } from '@/types/openingHours';
import { normalizeOpeningHours } from '@/utils/normalize-opening-hours';

// Day names used in OpeningHours keys
const VALID_DAY_KEYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

// ---------------------------------------------------------------------------
// isOpeningHoursBroken
// ---------------------------------------------------------------------------

/**
 * Returns true if `opening_hours` is stored in a non-canonical format
 * that the UI can't render. Known broken formats:
 *
 * 1. JoinHalal wrapper: `{ source: 'joinhalal', hours: <raw> }`
 * 2. Raw Schema.org spec array stored directly
 * 3. UberEats proprietary: `{ regularHours: [...] }` or `{ daysBitArray: [...] }`
 * 4. Any object that has keys but none of them are valid day names
 *
 * Returns false for null/undefined (nothing to fix) or valid OpeningHours.
 */
export function isOpeningHoursBroken(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  // Arrays are always broken (raw Schema.org spec stored directly)
  if (Array.isArray(value)) return true;

  if (typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  // JoinHalal wrapper: { source, hours }
  if ('source' in obj && 'hours' in obj) return true;

  // UberEats proprietary shapes
  if ('regularHours' in obj) return true;
  if ('daysBitArray' in obj) return true;

  // Check if it looks like valid OpeningHours (has at least one day key)
  const dayKeys = Object.keys(obj).filter((k) => VALID_DAY_KEYS.has(k));

  if (dayKeys.length === 0) {
    // Has keys but none are day names - broken
    return Object.keys(obj).length > 0;
  }

  // Has day keys - validate each one
  for (const k of dayKeys) {
    const val = obj[k];
    if (val === null) continue; // null = closed, that's fine
    if (typeof val !== 'object' || val === null) return true;
    const w = val as Record<string, unknown>;
    if (typeof w.open !== 'string' || typeof w.close !== 'string') return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// normalizeUberEatsHours
// ---------------------------------------------------------------------------

/**
 * UberEats day-of-week mapping. UberEats uses 1-based (1=Monday through 7=Sunday).
 * We also handle 0-based (0=Monday through 6=Sunday) as a fallback.
 */
const UBER_DAY_MAP_1BASED: Record<number, keyof OpeningHours> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

const UBER_DAY_MAP_0BASED: Record<number, keyof OpeningHours> = {
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  3: 'thursday',
  4: 'friday',
  5: 'saturday',
  6: 'sunday',
};

const UBER_DAY_NAME_MAP: Record<string, keyof OpeningHours> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

/**
 * Normalizes UberEats proprietary hours format to OpeningHours.
 *
 * Known UberEats shapes:
 * - `{ regularHours: [{ dayOfWeek: number|string, startTime, endTime }] }`
 * - Already-valid OpeningHours (passthrough)
 *
 * Falls back to the generic normalizeOpeningHours for unrecognized shapes.
 */
export function normalizeUberEatsHours(input: unknown): OpeningHours | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'object') return null;

  // Check if already valid OpeningHours
  const normalized = normalizeOpeningHours(input);
  if (normalized) return normalized;

  const obj = input as Record<string, unknown>;

  // Handle regularHours array
  if ('regularHours' in obj && Array.isArray(obj.regularHours)) {
    return parseRegularHours(obj.regularHours);
  }

  // If no known format matched, return null
  return null;
}

function parseRegularHours(hours: Array<Record<string, unknown>>): OpeningHours | null {
  if (hours.length === 0) return null;

  const result: OpeningHours = {};
  let foundAny = false;

  // Detect if day numbers are 0-based or 1-based
  // If any dayOfWeek is 0, it's 0-based; if max is 7, it's 1-based
  const hasZero = hours.some((h) => typeof h.dayOfWeek === 'number' && h.dayOfWeek === 0);
  const hasSeven = hours.some((h) => typeof h.dayOfWeek === 'number' && h.dayOfWeek === 7);
  const dayMap = hasZero && !hasSeven ? UBER_DAY_MAP_0BASED : UBER_DAY_MAP_1BASED;

  for (const entry of hours) {
    const dow = entry.dayOfWeek;
    let dayKey: keyof OpeningHours | undefined;

    if (typeof dow === 'number') {
      dayKey = dayMap[dow];
    } else if (typeof dow === 'string') {
      dayKey = UBER_DAY_NAME_MAP[dow.toLowerCase()];
    }

    if (!dayKey) continue;

    const start = entry.startTime as string | undefined;
    const end = entry.endTime as string | undefined;

    if (!start || !end) continue;
    if (typeof start !== 'string' || typeof end !== 'string') continue;

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue;

    result[dayKey] = { open: start, close: end };
    foundAny = true;
  }

  return foundAny ? result : null;
}

// ---------------------------------------------------------------------------
// needsLocationBackfill
// ---------------------------------------------------------------------------

interface ProviderLocationData {
  location_latitude: number | null;
  location_longitude: number | null;
  address_street: string | null;
  address_city: string | null;
}

/**
 * Returns true if a provider has address or coordinate data on the providers
 * table but no corresponding primary location row in the locations table.
 */
export function needsLocationBackfill(
  provider: ProviderLocationData,
  hasPrimaryLocation: boolean,
): boolean {
  if (hasPrimaryLocation) return false;

  // Provider must have at least some location data worth syncing
  const hasCoords = provider.location_latitude != null && provider.location_longitude != null;
  const hasAddress =
    (provider.address_street != null && provider.address_street !== '') ||
    (provider.address_city != null && provider.address_city !== '');

  return hasCoords || hasAddress;
}

// ---------------------------------------------------------------------------
// isMenuNamesOnly
// ---------------------------------------------------------------------------

interface MenuItemRow {
  name_de: string | null;
  price_cents: number | null;
  description_de: string | null;
  category: string | null;
}

/**
 * Returns true if the menu items are "names only" - they have names but
 * lack prices, descriptions, and categories. This indicates they were
 * imported from JoinHalal's Speisen field and could benefit from delivery
 * platform menu enrichment.
 *
 * Uses an 80% threshold: if 80%+ of items lack all three enrichment
 * fields (price, description, category), the menu is considered names-only.
 */
export function isMenuNamesOnly(items: MenuItemRow[]): boolean {
  if (items.length === 0) return false;

  let namesOnlyCount = 0;

  for (const item of items) {
    const hasPrice = item.price_cents != null;
    const hasDesc = item.description_de != null && item.description_de !== '';
    const hasCat = item.category != null && item.category !== '';

    if (!hasPrice && !hasDesc && !hasCat) {
      namesOnlyCount++;
    }
  }

  return namesOnlyCount / items.length >= 0.8;
}
