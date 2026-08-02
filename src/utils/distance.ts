/**
 * formatDistance — formats a distance in kilometers for display in the
 * "near me" search results (Plan 196).
 *
 * - Distances under 1 km are shown in meters, rounded to the nearest 10m.
 * - Distances >= 1 km are shown in kilometers with a German-locale comma
 *   decimal separator, one decimal place, omitted when the value is whole.
 * - Invalid input (null/undefined/negative) returns null so callers can
 *   hide the distance label rather than render garbage.
 */
export function formatDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm == null || Number.isNaN(distanceKm) || distanceKm < 0) {
    return null;
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000 / 10) * 10;
    return `${meters} m`;
  }

  const rounded = Math.round(distanceKm * 10) / 10;
  const isWhole = Number.isInteger(rounded);
  const formatted = isWhole ? String(rounded) : rounded.toFixed(1).replace('.', ',');

  return `${formatted} km`;
}
