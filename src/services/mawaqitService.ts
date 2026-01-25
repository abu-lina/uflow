/**
 * Mawaqit API Service
 * 
 * Provides prayer times for mosques from mawaqit.net (8000+ mosques worldwide)
 */

import type { MawaqitMosque, PrayerTime, MawaqitPrayerTimesResponse } from '@/types/mawaqit';

const MAWAQIT_API_URL = process.env.NEXT_PUBLIC_MAWAQIT_API_URL || 'https://api.mawaqit.net';
const MAWAQIT_BEARER_TOKEN = process.env.MAWAQIT_BEARER_TOKEN;

/**
 * Get authorization headers for Mawaqit API
 */
function getMawaqitHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add bearer token if configured
  if (MAWAQIT_BEARER_TOKEN) {
    headers['Authorization'] = `Bearer ${MAWAQIT_BEARER_TOKEN}`;
  }

  return headers;
}

/**
 * Search for mosques by name in Mawaqit database
 * 
 * @param query - Mosque name to search for
 * @param limit - Maximum number of results (default: 10)
 */
export async function searchMawaqitMosque(
  query: string,
  limit: number = 10
): Promise<MawaqitMosque[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Note: Actual endpoint may vary - check Mawaqit API docs at /docs
    // This is a typical pattern for mosque search APIs
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });

    const response = await fetch(`${MAWAQIT_API_URL}/api/v1/mosques/search?${params.toString()}`, {
      headers: getMawaqitHeaders(),
    });

    if (!response.ok) {
      // Don't log 404s as errors (mosque not found is expected)
      if (response.status !== 404) {
        console.error('Mawaqit API error:', response.status, response.statusText);
      }
      return [];
    }

    const data = await response.json();

    // Handle different possible response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    } else if (data.mosques && Array.isArray(data.mosques)) {
      return data.mosques;
    }

    return [];
  } catch (error) {
    console.error('Error searching Mawaqit mosques:', error);
    return [];
  }
}

/**
 * Get prayer times for a specific mosque
 * 
 * @param mosqueId - Mawaqit mosque ID
 * @param date - Date in YYYY-MM-DD format (default: today)
 */
export async function getPrayerTimes(
  mosqueId: string,
  date?: string
): Promise<PrayerTime | null> {
  if (!mosqueId) {
    return null;
  }

  try {
    // Use today's date if not provided
    const dateParam = date || new Date().toISOString().split('T')[0];
    
    // Note: Actual endpoint may vary - check Mawaqit API docs at /docs
    const response = await fetch(
      `${MAWAQIT_API_URL}/api/v1/mosques/${encodeURIComponent(mosqueId)}/prayer-times?date=${dateParam}`,
      {
        headers: getMawaqitHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Mosque not found or no prayer times available
        return null;
      }
      console.error('Mawaqit API error:', response.status, response.statusText);
      return null;
    }

    const data: MawaqitPrayerTimesResponse = await response.json();

    return data.prayer_times || null;
  } catch (error) {
    console.error('Error fetching prayer times from Mawaqit:', error);
    return null;
  }
}

/**
 * Find mosque in Mawaqit by matching name and location
 * 
 * This is a helper function to match a selected place with a Mawaqit mosque
 * 
 * @param mosqueName - Name of the mosque
 * @param latitude - Optional latitude for location matching
 * @param longitude - Optional longitude for location matching
 */
export async function findMawaqitMosqueByName(
  mosqueName: string,
  latitude?: number,
  longitude?: number
): Promise<MawaqitMosque | null> {
  if (!mosqueName || mosqueName.trim().length < 2) {
    return null;
  }

  try {
    // Search for mosques with similar name
    const results = await searchMawaqitMosque(mosqueName, 10);

    if (results.length === 0) {
      return null;
    }

    // If we have coordinates, try to find the closest match
    if (latitude !== undefined && longitude !== undefined) {
      let closestMosque: MawaqitMosque | null = null;
      let closestDistance = Infinity;

      for (const mosque of results) {
        if (mosque.latitude !== undefined && mosque.longitude !== undefined) {
          // Calculate distance using Haversine formula (simplified)
          const latDiff = Math.abs(mosque.latitude - latitude);
          const lonDiff = Math.abs(mosque.longitude - longitude);
          const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestMosque = mosque;
          }
        }
      }

      // If closest mosque is within ~1km, return it
      if (closestMosque && closestDistance < 0.01) {
        return closestMosque;
      }
    }

    // Otherwise, return the first result (best name match)
    return results[0] || null;
  } catch (error) {
    console.error('Error finding Mawaqit mosque:', error);
    return null;
  }
}
