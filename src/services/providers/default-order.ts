/** Brand is the text before " | " ("Loco Chicken | Kiel" -> "Loco Chicken"). */
export function brandOf(name: string): string {
  return name.split(' | ')[0].trim();
}

/** Rows the brand cap covers: the first page of the default list. */
export const BRAND_CAP_WINDOW = 12;

/**
 * #953: with the list in population order, defer entries so no brand holds more
 * than `maxPerBrand` of the first `window` rows. Everything after the window
 * keeps plain input order, so offset paging over the result stays stable.
 */
export function applyBrandCap<T extends { provider_name: string }>(
  rows: T[],
  window = BRAND_CAP_WINDOW,
  maxPerBrand = 2,
): T[] {
  const firstPage: T[] = [];
  const rest: T[] = [];
  const perBrand = new Map<string, number>();
  for (const row of rows) {
    const brand = brandOf(row.provider_name);
    const used = perBrand.get(brand) ?? 0;
    if (firstPage.length < window && used < maxPerBrand) {
      firstPage.push(row);
      perBrand.set(brand, used + 1);
    } else {
      rest.push(row);
    }
  }
  // Fewer distinct brands than the window needs: fill it from the deferred rows.
  const fill = rest.splice(0, Math.max(0, window - firstPage.length));
  return [...firstPage, ...fill, ...rest];
}
