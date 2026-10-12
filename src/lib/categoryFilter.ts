import { ALL_CATEGORIES_LABELS } from '@/constants/allCategoriesLabels';

/**
 * Check if a category value is a valid category ID (UUID).
 * Category IDs are UUIDs; anything else is not a usable filter.
 * The translated "all categories" labels are explicit user choices meaning
 * NO filter, so they must never count as valid ids (#254, fixed in 5f6cde34).
 */
export function isValidCategoryId(category: string | null | undefined): boolean {
  if (!category) return false;

  if (ALL_CATEGORIES_LABELS.includes(category)) return false;

  // Check if it's a valid UUID format (category IDs are UUIDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(category);
}

/**
 * The category label a filtered results card displays instead of the
 * provider's primary. Carries only what the card's locale-aware name
 * resolution needs — no second naming mechanism (#254 post-QA).
 */
export interface FilteredCategoryLabel {
  name_de: string;
  name_en?: string;
}

/**
 * Resolve the label to display on every card when a category filter is
 * active. Returns null when the raw filter value is not a real category
 * filter (absent, an all-categories sentinel, or unrecognised — the search
 * layer already fails closed on the last one), so the badge stays on the
 * provider's primary category.
 *
 * `record` short-circuits the fetch: the /food/[city]/[category] route has
 * already loaded the category row for its own checks, so passing it avoids
 * a second query. `fetchById` is injected so this module stays pure.
 * A missing row or a failed fetch degrades to null (primary badge), never
 * to an unlabelled filter.
 */
export async function resolveFilteredCategoryLabel(
  category: string | null | undefined,
  opts: {
    record?: FilteredCategoryLabel | null;
    fetchById?: (id: string) => Promise<FilteredCategoryLabel | null>;
  } = {},
): Promise<FilteredCategoryLabel | null> {
  if (!isValidCategoryId(category)) return null;
  if (opts.record) {
    return { name_de: opts.record.name_de, name_en: opts.record.name_en };
  }
  if (!opts.fetchById) return null;
  try {
    const record = await opts.fetchById(category as string);
    return record ? { name_de: record.name_de, name_en: record.name_en } : null;
  } catch {
    return null;
  }
}
