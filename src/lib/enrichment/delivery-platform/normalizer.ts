import type { OpeningHours, OpeningHoursDay, OpeningHoursWindow } from '@/types/openingHours';

interface WoltOpeningHour {
  day: number;
  opens: string;
  closes: string;
}

interface WoltVenue {
  name: string;
  slug: string;
  [key: string]: unknown;
}

export interface NormalizedWoltVenue {
  name: string;
  slug: string;
  url: string;
  openingHours: OpeningHours | null;
  menuItemNames: string[];
}

const DAY_MAP: Record<number, keyof OpeningHours> = {
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  3: 'thursday',
  4: 'friday',
  5: 'saturday',
  6: 'sunday',
};

function parseTime(timeStr: string): string | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = match[2];
  if (h < 0 || h > 24 || parseInt(m, 10) < 0 || parseInt(m, 10) > 59) return null;
  if (h === 24 && m !== '00') return null;
  const hour = String(h).padStart(2, '0');
  return `${hour}:${m}`;
}

export function normalizeWoltOpeningHours(
  woltHours: WoltOpeningHour[] | null | undefined
): OpeningHours | null {
  if (!woltHours || woltHours.length === 0) return null;

  const result: OpeningHours = {};

  for (const wh of woltHours) {
    const dayKey = DAY_MAP[wh.day];
    if (dayKey === undefined) continue;

    const open = parseTime(wh.opens);
    const close = parseTime(wh.closes);

    if (!open || !close) continue;

    const window: OpeningHoursWindow = { open, close };
    result[dayKey] = window as OpeningHoursDay;
  }

  if (Object.keys(result).length === 0) return null;

  return result;
}

export function normalizeWoltVenue(venue: WoltVenue): NormalizedWoltVenue {
  const rawHours = venue['opening_hours'] as WoltOpeningHour[] | null | undefined;
  return {
    name: venue.name,
    slug: venue.slug,
    url: `https://wolt.com/de/deu/venue/${venue.slug}`,
    openingHours: normalizeWoltOpeningHours(rawHours),
    menuItemNames: [],
  };
}
