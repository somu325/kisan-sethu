/**
 * Pure geographical distance calculations and expanding-radius search utility.
 */

/**
 * Calculates great-circle distance between two coordinate pairs in kilometers using the Haversine formula.
 * Returns distance rounded to 1 decimal place.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;

  // Return formatted to 1 decimal place
  return Math.round(km * 10) / 10;
}

/**
 * Standard expanding search radius steps in kilometers: 10km -> 25km -> 50km -> 100km.
 */
export const SEARCH_RADIUS_STEPS = [10, 25, 50, 100] as const;

/**
 * Executes a query with expanding search radius, stopping at the first radius that produces results.
 */
export async function expandSearchRadius<T>(
  radii: readonly number[] = SEARCH_RADIUS_STEPS,
  fetcher: (radiusKm: number) => Promise<T[]>
): Promise<{ results: T[]; effectiveRadiusKm: number }> {
  for (const r of radii) {
    const list = await fetcher(r);
    if (list && list.length > 0) {
      return { results: list, effectiveRadiusKm: r };
    }
  }
  return { results: [], effectiveRadiusKm: radii[radii.length - 1] || 100 };
}
