import { getOpenStatus } from './openStatus';
import type { OpeningHours } from '@/types/openingHours';

/**
 * filterOpenNow — filters a list of items down to only those currently open,
 * using the single tested `getOpenStatus` source of truth (device-local time,
 * overnight-window aware). No-op (returns items unchanged) when the
 * "open now" filter is inactive. Order-preserving.
 *
 * Extracted as a standalone utility (Plan 196 bug fix) so the "Open now"
 * filter can be applied consistently to both near-me results and the regular
 * paginated search result set (ProvidersContent).
 */
export function filterOpenNow<T extends { opening_hours?: OpeningHours | null }>(
  items: T[],
  openNowActive: boolean,
): T[] {
  if (!openNowActive) {
    return items;
  }
  return items.filter((item) => getOpenStatus(item.opening_hours ?? null).isOpen);
}
