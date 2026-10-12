/**
 * #254 post-QA: filtered results show the FILTERED category on every card,
 * not the provider's primary. Spec decision 5 revised after live QA:
 * a user filtering "Kebab / Döner" saw a card badged "Turkish" (its
 * primary, matched on a secondary) and read it as a bug.
 *
 * resolveFilteredCategoryLabel decides whether the raw ?category= value is
 * a real filter and, if so, yields the { name_de, name_en } label the cards
 * display. Sentinels (All/Alle/الكل/Tümü/سب/ټول) and unrecognised values are
 * NOT filters — the badge must stay on the primary for them.
 */
import { describe, expect, it, vi } from 'vitest';

import { ALL_CATEGORIES_LABELS } from '@/constants/allCategoriesLabels';
import { isValidCategoryId, resolveFilteredCategoryLabel } from '@/lib/categoryFilter';

const CATEGORY_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';
const KEBAB_DOENER = { name_de: 'Kebab / Döner', name_en: 'Kebab / Döner' };

describe('isValidCategoryId', () => {
  it('accepts a UUID', () => {
    expect(isValidCategoryId(CATEGORY_ID)).toBe(true);
  });

  it.each(ALL_CATEGORIES_LABELS)('rejects the "%s" all-categories sentinel', (label) => {
    expect(isValidCategoryId(label)).toBe(false);
  });

  it('rejects bogus, empty and missing values', () => {
    expect(isValidCategoryId('bogus')).toBe(false);
    expect(isValidCategoryId('')).toBe(false);
    expect(isValidCategoryId(null)).toBe(false);
    expect(isValidCategoryId(undefined)).toBe(false);
  });
});

describe('resolveFilteredCategoryLabel', () => {
  it('fetches the label once when the filter is a valid category id', async () => {
    const fetchById = vi.fn().mockResolvedValue(KEBAB_DOENER);

    const label = await resolveFilteredCategoryLabel(CATEGORY_ID, { fetchById });

    expect(fetchById).toHaveBeenCalledWith(CATEGORY_ID);
    expect(label).toEqual(KEBAB_DOENER);
  });

  it('uses the already-fetched record when the route provides one (path form)', async () => {
    const fetchById = vi.fn();

    const label = await resolveFilteredCategoryLabel(CATEGORY_ID, {
      record: KEBAB_DOENER,
      fetchById,
    });

    expect(label).toEqual(KEBAB_DOENER);
    expect(fetchById).not.toHaveBeenCalled();
  });

  it.each(ALL_CATEGORIES_LABELS)(
    'treats the "%s" sentinel as no filter — returns null and never fetches',
    async (sentinel) => {
      const fetchById = vi.fn();

      const label = await resolveFilteredCategoryLabel(sentinel, { fetchById });

      expect(label).toBeNull();
      expect(fetchById).not.toHaveBeenCalled();
    },
  );

  it('treats an unrecognised value as no label (search already fails closed)', async () => {
    const fetchById = vi.fn();

    const label = await resolveFilteredCategoryLabel('bogus', { fetchById });

    expect(label).toBeNull();
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('returns null with no filter at all (free-text search shows the primary)', async () => {
    const fetchById = vi.fn();

    expect(await resolveFilteredCategoryLabel(null, { fetchById })).toBeNull();
    expect(await resolveFilteredCategoryLabel(undefined, { fetchById })).toBeNull();
    expect(await resolveFilteredCategoryLabel('', { fetchById })).toBeNull();
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('degrades to null when the category row is missing or the fetch fails', async () => {
    expect(
      await resolveFilteredCategoryLabel(CATEGORY_ID, {
        fetchById: vi.fn().mockResolvedValue(null),
      }),
    ).toBeNull();

    expect(
      await resolveFilteredCategoryLabel(CATEGORY_ID, {
        fetchById: vi.fn().mockRejectedValue(new Error('db down')),
      }),
    ).toBeNull();
  });
});
