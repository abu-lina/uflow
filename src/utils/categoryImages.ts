/**
 * Static category image resolver.
 *
 * Images are stored in public/images/categories/{section}/{folder}/{n}.png
 * Add images to the folder, then increment `count` in the mapping below.
 * When count is 0 the card renders mint + ornament only (no photo layer).
 *
 * Variant selection is deterministic per provider: same provider always
 * gets the same image, but neighbouring cards look varied.
 */

interface CategoryImageConfig {
  section: string;
  folder: string;
  /** Number of available PNG variants (1.png … count.png). 0 = no images yet. */
  count: number;
}

const CARD_BACKGROUND_COLORS = ['#CBE6E2', '#DDEBF0', '#FBF1D9', '#FAE6E6'] as const;

/**
 * Map of category_id → local image config.
 * Only categories with count > 0 will render a stock photo layer.
 */
const CATEGORY_IMAGES: Record<string, CategoryImageConfig> = {
  // ── Food ──────────────────────────────────────────────────────────────
  '232c2870-7929-43eb-a909-6cac90203192': { section: 'food', folder: 'turkish',            count: 8 },
  '0814f0b7-585b-42f8-b4c8-c225582571b4': { section: 'food', folder: 'afghan',             count: 0 },
  '8550d193-5623-49da-b8c9-1187f8fe5e6c': { section: 'food', folder: 'african',            count: 0 },
  'a8d3cf09-b606-4de9-8744-b8c584c5e172': { section: 'food', folder: 'arabic',             count: 6 },
  '6bf91875-5934-4ddd-93c6-11c014d278ef': { section: 'food', folder: 'asian',              count: 0 },
  'aeec899a-65b5-4201-8f1b-b278bd6ef30f': { section: 'food', folder: 'bakery-pastries',    count: 0 },
  '88d60ec2-497e-40ea-bce7-9c1ec8b4d007': { section: 'food', folder: 'balkan',             count: 0 },
  '48ab4ab7-ae2f-4cde-8617-15134908acca': { section: 'food', folder: 'breakfast-brunch',   count: 0 },
  '673805db-9691-4097-a350-2a8880f8f950': { section: 'food', folder: 'burgers-sandwiches', count: 0 },
  'f75d2cde-13da-4aba-ac26-737048bb8a8b': { section: 'food', folder: 'catering-events',    count: 0 },
  '5677778e-c3a2-4dc8-943a-a00435df2ee2': { section: 'food', folder: 'chicken-poultry',    count: 0 },
  'eea06ee4-2718-4bfa-b1c0-09036d1fd891': { section: 'food', folder: 'desserts-sweets',    count: 0 },
  '756f64fe-ac4e-4628-a0a1-d9618aa888a7': { section: 'food', folder: 'drinks-smoothies',   count: 0 },
  'c3011768-7e4a-419f-b034-58becd3c998b': { section: 'food', folder: 'fish-seafood',       count: 0 },
  '20c10efe-404b-4a39-bb81-5089a0332d78': { section: 'food', folder: 'food-drink',         count: 0 },
  'f502a5fa-3ea0-4a6b-9e1b-884b10811092': { section: 'food', folder: 'german-cuisine',     count: 0 },
  'e8ee13f4-e795-4df4-8e21-d521a502f912': { section: 'food', folder: 'grilled-bbq',        count: 0 },
  'bb0d9c62-7849-4f9a-98ca-c98ded8ab73c': { section: 'food', folder: 'meal-prep-delivery', count: 0 },
  'de5b71c6-cdc6-4a38-a135-4b151df54fc7': { section: 'food', folder: 'meat-dishes',        count: 0 },
  '4aa30403-895a-4d68-b617-6882c0a20adf': { section: 'food', folder: 'north-african',      count: 0 },
  '4403dafb-eb0c-4447-8224-94f34e827b78': { section: 'food', folder: 'oriental',           count: 0 },
  'f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae': { section: 'food', folder: 'turkish',            count: 8 }, // TEMP: using turkish images until indian-pakistani folder is ready
  'b35965ed-fdb0-4bc5-a872-ab3bbc5139de': { section: 'food', folder: 'italian',            count: 4 },
  'ae7f10c1-62da-446a-8912-b36966650ef6': { section: 'food', folder: 'pasta-noodles',      count: 0 },
  '549ee1f0-a2fb-4c05-b548-0e702456ea16': { section: 'food', folder: 'persian',            count: 0 },
  'd1d0ba2a-98c6-43f5-bd15-4c0b232eae56': { section: 'food', folder: 'pizza-tarte',        count: 0 },
  '91fdd30f-c2b7-42b7-85a6-6ac008613b19': { section: 'food', folder: 'rice-grain-dishes',  count: 0 },
  'cc9b5091-df5d-4410-89cb-8d94224e0d55': { section: 'food', folder: 'salads-bowls',       count: 0 },
  '6551ea01-f2d7-457a-96d3-96e9b8414172': { section: 'food', folder: 'soups-stews',        count: 0 },
  '64f943e8-d25c-4b09-9846-b78148a62b72': { section: 'food', folder: 'starters-snacks',    count: 0 },
  '7acbb5e6-703c-4fd1-8f2f-676d2f0f2db9': { section: 'food', folder: 'vegan',              count: 0 },
  '2ee3929e-acc4-44eb-b93c-7714496927a9': { section: 'food', folder: 'vegetarian',         count: 0 },
  '12ca550a-62b3-464a-984c-5f3e8ac547dc': { section: 'food', folder: 'west-african',       count: 0 },
  '24e15afc-4be3-4fc4-bd7d-cb201b382366': { section: 'food', folder: 'wraps-doner-falafel',count: 0 },

  // ── Store / Services ──────────────────────────────────────────────────
  '49563bf0-6962-4fd8-9147-5e68e9310eb1': { section: 'store', folder: 'clothing-fashion',  count: 0 },
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0': { section: 'store', folder: 'crafts-repair',     count: 0 },
  '21e8a577-f42c-499d-a277-0b8ba327c00b': { section: 'store', folder: 'education',         count: 0 },
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d': { section: 'store', folder: 'health-sports',     count: 0 },
  '5e5d910d-d790-4184-a061-9cd74d0950e8': { section: 'store', folder: 'other',             count: 0 },
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83': { section: 'store', folder: 'services',          count: 0 },

  // ── All sections ──────────────────────────────────────────────────────
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7': { section: 'all',   folder: 'community-support', count: 0 },
};

/**
 * Stable numeric hash of a UUID string (no external deps).
 * Same input always returns the same non-negative integer.
 */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getVariantNumber(categoryId: string, providerId: string | null | undefined, count: number): number {
  const seed = providerId ?? categoryId;
  return (hashId(`${categoryId}-${seed}`) % count) + 1;
}

export function getCategoryCardBackgroundColor(
  categoryId: string | null | undefined,
  providerId: string | null | undefined,
): string {
  const seed = providerId ?? categoryId ?? 'default';
  const idx = hashId(seed) % CARD_BACKGROUND_COLORS.length;
  return CARD_BACKGROUND_COLORS[idx];
}

export function isCategoryStaticImageUrl(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/images/categories/');
}

/**
 * Returns the public path to a category stock image, or null if none exist yet.
 *
 * @param categoryId  - The provider's category_id from the DB.
 * @param providerId  - Used to deterministically pick a variant so each card
 *                      always shows the same image but cards look varied.
 */
export function getCategoryStaticImageUrl(
  categoryId: string | null | undefined,
  providerId: string | null | undefined,
): string | null {
  if (!categoryId) return null;

  const config = CATEGORY_IMAGES[categoryId];
  if (!config || config.count === 0) return null;

  const idx = getVariantNumber(categoryId, providerId, config.count);

  return `/images/categories/${config.section}/${config.folder}/${idx}.png`;
}
