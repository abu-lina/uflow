/**
 * Normalizes various opening hours formats into the OpeningHours type
 * expected by the UI (src/types/openingHours.ts).
 *
 * Handles:
 * 1. Schema.org openingHoursSpecification array (from JoinHalal / Rank Math)
 * 2. Schema.org shorthand strings ("Mo-Fr 09:00-18:00")
 * 3. The { source, hours } wrapper produced by extractEnrichmentData
 * 4. Data already in OpeningHours format (passthrough)
 *
 * Pure function, no side effects.
 */

import type { OpeningHours } from '@/types/openingHours';

// Day name mapping: various formats -> lowercase key
const DAY_MAP: Record<string, keyof OpeningHours> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

// Schema.org shorthand day codes
const SHORT_DAY_MAP: Record<string, keyof OpeningHours> = {
  mo: 'monday',
  tu: 'tuesday',
  we: 'wednesday',
  th: 'thursday',
  fr: 'friday',
  sa: 'saturday',
  su: 'sunday',
};

const SHORT_DAY_ORDER: (keyof OpeningHours)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Resolves a day-of-week value to a lowercase OpeningHours key.
 * Handles: "Monday", "MONDAY", "https://schema.org/Monday"
 */
function resolveDayName(raw: string): keyof OpeningHours | null {
  // Strip Schema.org URL prefix
  const name = raw.replace(/^https?:\/\/schema\.org\//i, '').toLowerCase();
  return DAY_MAP[name] ?? null;
}

/**
 * Checks if the input is already in the OpeningHours format
 * (object with day keys containing { open, close } or null).
 */
function isAlreadyNormalized(input: unknown): input is OpeningHours {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const obj = input as Record<string, unknown>;

  // Must have at least one recognized day key
  const dayKeys = Object.keys(obj).filter((k) => DAY_MAP[k]);
  if (dayKeys.length === 0) return false;

  // Every day key must be null or { open: string, close: string }
  return dayKeys.every((k) => {
    const val = obj[k];
    if (val === null) return true;
    if (typeof val === 'object' && val !== null) {
      const w = val as Record<string, unknown>;
      return typeof w.open === 'string' && typeof w.close === 'string';
    }
    return false;
  });
}

/**
 * Parses Schema.org openingHoursSpecification array.
 * Each entry: { dayOfWeek: string|string[], opens: string, closes: string }
 */
function parseSpecificationArray(specs: unknown[]): OpeningHours | null {
  const result: OpeningHours = {};
  let foundAny = false;

  for (const spec of specs) {
    if (!spec || typeof spec !== 'object') continue;
    const s = spec as Record<string, unknown>;

    const opens = s.opens as string | undefined;
    const closes = s.closes as string | undefined;
    if (!opens || !closes) continue;

    const rawDays = s.dayOfWeek;
    if (!rawDays) continue;

    const days: string[] = Array.isArray(rawDays) ? rawDays : [rawDays as string];

    for (const d of days) {
      if (typeof d !== 'string') continue;
      const dayKey = resolveDayName(d);
      if (!dayKey) continue;

      result[dayKey] = { open: opens, close: closes };
      foundAny = true;
    }
  }

  return foundAny ? result : null;
}

/**
 * Expands a day range like "Mo-Fr" into individual day keys.
 */
function expandDayRange(range: string): (keyof OpeningHours)[] {
  const lower = range.toLowerCase();

  // Single day: "Mo"
  if (SHORT_DAY_MAP[lower]) {
    return [SHORT_DAY_MAP[lower]];
  }

  // Range: "Mo-Fr"
  const match = lower.match(/^([a-z]{2})-([a-z]{2})$/);
  if (!match) return [];

  const startDay = SHORT_DAY_MAP[match[1]];
  const endDay = SHORT_DAY_MAP[match[2]];
  if (!startDay || !endDay) return [];

  const startIdx = SHORT_DAY_ORDER.indexOf(startDay);
  const endIdx = SHORT_DAY_ORDER.indexOf(endDay);
  if (startIdx < 0 || endIdx < 0) return [];

  if (startIdx <= endIdx) {
    return SHORT_DAY_ORDER.slice(startIdx, endIdx + 1);
  }
  // Wrap around (e.g., "Fr-Mo")
  return [...SHORT_DAY_ORDER.slice(startIdx), ...SHORT_DAY_ORDER.slice(0, endIdx + 1)];
}

/**
 * Parses Schema.org shorthand string format.
 * Examples: "Mo-Fr 09:00-18:00", "Sa 10:00-16:00"
 */
function parseShorthandString(str: string): OpeningHours | null {
  const result: OpeningHours = {};
  let foundAny = false;

  // Each entry: "Mo-Fr 09:00-18:00" or "Mo 09:00-18:00"
  const entries = str.includes(',') ? str.split(',').map((s) => s.trim()) : [str.trim()];

  for (const entry of entries) {
    const match = entry.match(/^([A-Za-z-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) continue;

    const dayPart = match[1];
    const open = match[2];
    const close = match[3];

    const days = expandDayRange(dayPart);
    for (const day of days) {
      result[day] = { open, close };
      foundAny = true;
    }
  }

  return foundAny ? result : null;
}

/**
 * Normalizes opening hours from various formats to the OpeningHours type.
 *
 * @param input Raw opening hours data (Schema.org spec, shorthand strings,
 *              wrapped format, or already-normalized data)
 * @returns Normalized OpeningHours object or null if input is invalid/empty
 */
export function normalizeOpeningHours(input: unknown): OpeningHours | null {
  if (input === null || input === undefined) return null;

  // Handle { source, hours } wrapper from extractEnrichmentData
  if (typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    if ('source' in obj && 'hours' in obj) {
      return normalizeOpeningHours(obj.hours);
    }

    // Check if already in OpeningHours format
    if (isAlreadyNormalized(input)) {
      return input;
    }
  }

  // Handle single shorthand string ("Mo-Su 10:00-22:00")
  if (typeof input === 'string') {
    return parseShorthandString(input);
  }

  // Handle arrays
  if (Array.isArray(input)) {
    if (input.length === 0) return null;

    // Check if it's an array of shorthand strings
    if (typeof input[0] === 'string') {
      const result: OpeningHours = {};
      let foundAny = false;
      for (const str of input) {
        if (typeof str !== 'string') continue;
        const parsed = parseShorthandString(str);
        if (parsed) {
          Object.assign(result, parsed);
          foundAny = true;
        }
      }
      return foundAny ? result : null;
    }

    // Schema.org openingHoursSpecification array
    return parseSpecificationArray(input);
  }

  return null;
}
