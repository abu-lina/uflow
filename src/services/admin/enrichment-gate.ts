/**
 * Menu alcohol check service — Plan 193.
 *
 * Quality gate that prevents provider approval when enriched menu items
 * contain alcohol keywords, alerting the reviewer to menu content that
 * may not have been visible during manual website review.
 *
 * Uses service-role Supabase client for reads (bypasses RLS).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { detectAlcohol } from '@/lib/enrichment/delivery-platform/alcohol-detector';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuAlcoholCheckResult {
  hasAlcohol: boolean;
  /** Menu item names that matched alcohol keywords */
  matchedItemNames: string[];
  /** Unique alcohol keywords found across matched items */
  matchedKeywords: string[];
  /** Total number of menu items checked for this provider */
  totalMenuItems: number;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Check a food provider's menu items for alcohol content detected by
 * automated enrichment (e.g. Wolt). Reads the food_menu table entries
 * directly — these are the items that were imported into the database
 * and would be displayed on the public listing.
 *
 * Returns details about which items matched and which keywords were found,
 * so the reviewer can make an informed decision before approving.
 */
export async function checkMenuForAlcohol(
  providerId: string
): Promise<MenuAlcoholCheckResult> {
  const supabase = getSupabaseAdmin();

  const { data: menuItems, error } = await supabase
    .from('food_menu')
    .select('name_de, name_en')
    .eq('provider_id', providerId);

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  if (!menuItems || menuItems.length === 0) {
    return { hasAlcohol: false, matchedItemNames: [], matchedKeywords: [], totalMenuItems: 0 };
  }

  // Collect all item names — run detection against the primary (German) names
  // since the keyword list is German-focused. If name_de is empty, fall back to name_en.
  const itemNames: string[] = [];
  for (const item of menuItems) {
    if (item.name_de) {
      itemNames.push(item.name_de);
    } else if (item.name_en) {
      itemNames.push(item.name_en);
    }
  }

  // Run alcohol detection on the menu item names
  const detection = detectAlcohol(itemNames);

  if (detection.signal !== 'definite_alcohol') {
    return { hasAlcohol: false, matchedItemNames: [], matchedKeywords: [], totalMenuItems: menuItems.length };
  }

  return {
    hasAlcohol: true,
    matchedItemNames: detection.matchedItems,
    matchedKeywords: detection.matchedKeywords,
    totalMenuItems: menuItems.length,
  };
}
