/**
 * Place Autocomplete Service using Photon API
 * 
 * Provides general place search with location bias, replacing the restrictive
 * Overpass API approach with name-based search.
 */

import type { OSMPlace, OSMPlaceType, PhotonFeature, PhotonResponse, NominatimPOIResult, FoursquarePlace, FoursquareResponse } from '@/types/osm';

const PHOTON_API_URL = 'https://photon.komoot.io/api';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const FOURSQUARE_API_URL = 'https://api.foursquare.com/v3/places/search';

// Foursquare category IDs
const FOURSQUARE_CATEGORY_MOSQUE = '5ef17a861a251a003bea905b';
const FOURSQUARE_CATEGORY_HALAL_RESTAURANT = '52e81612bcbc57f1066b79ff';

type NominatimCitySearchResult = {
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
};

/**
 * Get city coordinates using Nominatim (reused from osmPlaceService)
 */
async function getCityCoords(cityName: string): Promise<{ lat: number; lon: number; bbox?: [number, number, number, number] } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(cityName)}&` +
      `addressdetails=1&` +
      `limit=1&` +
      `featuretype=city,town,village`,
      {
        headers: {
          'User-Agent': 'UmmahFlow/1.0',
          'Accept-Language': 'de,en',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NominatimCitySearchResult[];
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    const bbox = result.boundingbox; // [min_lat, max_lat, min_lon, max_lon]
    
    const coords: { lat: number; lon: number; bbox?: [number, number, number, number] } = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };

    if (bbox && bbox.length === 4) {
      // Convert to [min_lon, min_lat, max_lon, max_lat]
      coords.bbox = [parseFloat(bbox[2]), parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])];
    }

    return coords;
  } catch (error) {
    console.error('Error getting city coordinates:', error);
    return null;
  }
}

function normalizeCityName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isWithinBbox(
  lat: number,
  lon: number,
  bbox: [number, number, number, number]
): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

function matchesCityFilter(
  place: OSMPlace,
  cityName: string,
  bbox?: [number, number, number, number]
): boolean {
  if (bbox && isWithinBbox(place.lat, place.lon, bbox)) {
    return true;
  }

  const placeCity = place.address?.city;
  if (!placeCity) {
    return false;
  }

  const normalizedCity = normalizeCityName(cityName);
  const normalizedPlaceCity = normalizeCityName(placeCity);

  return (
    normalizedPlaceCity === normalizedCity ||
    normalizedPlaceCity.startsWith(`${normalizedCity} `) ||
    normalizedPlaceCity.startsWith(`${normalizedCity}-`)
  );
}

/**
 * Determine place type from Photon OSM tags
 * Returns a best-guess type, defaulting to 'restaurant' for unknown types
 */
function getPlaceTypeFromPhoton(properties: PhotonFeature['properties']): OSMPlaceType {
  const osmKey = properties.osm_key;
  const osmValue = properties.osm_value;
  const name = (properties.name || '').toLowerCase();

  const religion = typeof properties.religion === 'string' ? properties.religion.toLowerCase() : '';
  const denomination = typeof properties.denomination === 'string' ? properties.denomination.toLowerCase() : '';
  const hasMuslimSignal =
    name.includes('mosque') ||
    name.includes('masjid') ||
    name.includes('moschee') ||
    name.includes('musalla') ||
    name.includes('islamic') ||
    name.includes('islamisches') ||
    name.includes('muslim') ||
    religion.includes('muslim') ||
    religion.includes('islam') ||
    denomination.includes('islam');

  // Mosque - check both tags and name
  if (osmKey === 'amenity' && osmValue === 'place_of_worship') {
    if (hasMuslimSignal) {
      return 'mosque';
    }
    return 'unknown';
  }

  // Islamic center
  if (osmKey === 'amenity' && osmValue === 'community_centre') {
    if (name.includes('islamic') || name.includes('muslim') || name.includes('masjid') || name.includes('islam')) {
      return 'islamic_center';
    }
  }

  // Restaurant
  if (osmKey === 'amenity' && osmValue === 'restaurant') {
    return 'restaurant';
  }

  // Fast food
  if (osmKey === 'amenity' && osmValue === 'fast_food') {
    return 'fast_food';
  }

  // Shop
  if (osmKey === 'shop') {
    return 'shop';
  }

  // Food-related places
  if (osmKey === 'amenity' && (osmValue === 'cafe' || osmValue === 'food_court' || osmValue === 'bar')) {
    return 'restaurant';
  }

  // Name-based fallback for mosques and islamic centers
  if (
    name.includes('mosque') ||
    name.includes('masjid') ||
    name.includes('moschee')
  ) {
    return 'mosque';
  }
  if (
    name.includes('islamic center') ||
    name.includes('islamic centre') ||
    name.includes('islamisches zentrum') ||
    name.includes('islamic community')
  ) {
    return 'islamic_center';
  }

  // Name-based fallback for mosques and islamic centers
  if (hasMuslimSignal) {
    return 'mosque';
  }
  if (
    name.includes('islamic center') ||
    name.includes('islamic centre') ||
    name.includes('islamisches zentrum') ||
    name.includes('islamic community')
  ) {
    return 'islamic_center';
  }

  return 'unknown';
}

/**
 * Determine place type from Nominatim result
 */
function getPlaceTypeFromNominatim(result: NominatimPOIResult): OSMPlaceType {
  const osmClass = result.class || '';
  const osmType = result.type || '';
  const name = (result.namedetails?.name || result.display_name || '').toLowerCase();
  const religion = result.extratags?.religion?.toLowerCase() || '';
  const denomination = result.extratags?.denomination?.toLowerCase() || '';
  const hasMuslimSignal =
    name.includes('mosque') ||
    name.includes('masjid') ||
    name.includes('moschee') ||
    name.includes('musalla') ||
    name.includes('islamic') ||
    name.includes('islamisches') ||
    name.includes('muslim') ||
    religion.includes('muslim') ||
    religion.includes('islam') ||
    denomination.includes('islam');

  // Mosque
  if (osmClass === 'amenity' && osmType === 'place_of_worship') {
    if (hasMuslimSignal) {
      return 'mosque';
    }
    return 'unknown';
  }

  // Islamic center
  if (osmClass === 'amenity' && osmType === 'community_centre') {
    if (name.includes('islamic') || name.includes('muslim') || name.includes('masjid') || name.includes('islam')) {
      return 'islamic_center';
    }
  }

  // Restaurant
  if (osmClass === 'amenity' && osmType === 'restaurant') {
    return 'restaurant';
  }

  // Fast food
  if (osmClass === 'amenity' && osmType === 'fast_food') {
    return 'fast_food';
  }

  // Shop
  if (osmClass === 'shop') {
    return 'shop';
  }

  // Food-related places
  if (osmClass === 'amenity' && (osmType === 'cafe' || osmType === 'food_court' || osmType === 'bar')) {
    return 'restaurant';
  }

  // Name-based fallback for mosques and islamic centers
  if (hasMuslimSignal) {
    return 'mosque';
  }
  if (
    name.includes('islamic center') ||
    name.includes('islamic centre') ||
    name.includes('islamisches zentrum') ||
    name.includes('islamic community')
  ) {
    return 'islamic_center';
  }

  return 'unknown';
}

/**
 * Map Nominatim POI result to OSMPlace
 */
function mapNominatimToOSMPlace(result: NominatimPOIResult): OSMPlace | null {
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const placeType = getPlaceTypeFromNominatim(result);
  const name = result.namedetails?.name || result.display_name.split(',')[0] || 'Unnamed Place';

  // Extract contact info from extratags
  const contact = {
    phone: result.extratags?.phone || result.extratags?.['contact:phone'] || undefined,
    email: result.extratags?.email || result.extratags?.['contact:email'] || undefined,
    website: result.extratags?.website || result.extratags?.['contact:website'] || undefined,
    instagram: result.extratags?.instagram || result.extratags?.['contact:instagram'] || undefined,
  };

  // Build address from address object
  const address = {
    street: result.address?.road || undefined,
    houseNumber: result.address?.house_number || undefined,
    postcode: result.address?.postcode || undefined,
    city: result.address?.city || result.address?.town || result.address?.village || undefined,
    country: result.address?.country || undefined,
  };

  // Build display name
  const addressParts = [
    address.street && address.houseNumber ? `${address.street} ${address.houseNumber}` : address.street,
    address.postcode,
    address.city,
  ].filter(Boolean);
  
  const displayName = addressParts.length > 0 
    ? `${name}, ${addressParts.join(', ')}`
    : name;

  // Map OSM type
  const osmTypeMap: Record<string, 'node' | 'way' | 'relation'> = {
    'node': 'node',
    'way': 'way',
    'relation': 'relation',
  };

  // Parse osm_id (can be string like "12345" or "way/12345")
  const osmIdStr = result.osm_id.toString();
  const osmId = parseInt(osmIdStr.split('/').pop() || osmIdStr, 10);

  return {
    id: isNaN(osmId) ? result.place_id : osmId,
    type: osmTypeMap[result.osm_type] || 'node',
    placeType,
    name,
    lat,
    lon,
    address: Object.keys(address).some(k => address[k as keyof typeof address]) ? address : undefined,
    contact: Object.keys(contact).some(k => contact[k as keyof typeof contact]) ? contact : undefined,
    tags: {
      [result.class || '']: result.type || '',
      source: 'nominatim',
    },
    displayName,
  };
}

/**
 * Search Nominatim for POIs (free-form query with contact info)
 */
async function searchNominatimPOI(
  query: string,
  cityCoords: { lat: number; lon: number; bbox?: [number, number, number, number] }
): Promise<OSMPlace[]> {
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1', // Get phone, email, website
      namedetails: '1', // Get alternative names
      limit: '10',
    });

    // Use viewbox to bias results toward city
    if (cityCoords.bbox) {
      const [minLon, minLat, maxLon, maxLat] = cityCoords.bbox;
      // Expand bbox slightly for better coverage
      const lonDiff = (maxLon - minLon) * 0.1;
      const latDiff = (maxLat - minLat) * 0.1;
      params.set('viewbox', `${minLon - lonDiff},${minLat - latDiff},${maxLon + lonDiff},${maxLat + latDiff}`);
      params.set('bounded', '0'); // Don't strictly bound, just bias
    } else {
      // Fallback: use city center with approximate viewbox
      const viewboxSize = 0.1; // ~11km radius
      params.set('viewbox', `${cityCoords.lon - viewboxSize},${cityCoords.lat - viewboxSize},${cityCoords.lon + viewboxSize},${cityCoords.lat + viewboxSize}`);
      params.set('bounded', '0');
    }

    const response = await fetch(`${NOMINATIM_API_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': 'UmmahFlow/1.0',
        'Accept-Language': 'de,en',
      },
    });

    if (!response.ok) {
      console.error('Nominatim POI API error:', response.status, response.statusText);
      return [];
    }

    const data: NominatimPOIResult[] = await response.json();

    if (!data || data.length === 0) {
      return [];
    }

    // Map Nominatim results to OSMPlace
    const places = data
      .map(mapNominatimToOSMPlace)
      .filter((place): place is OSMPlace => place !== null);

    return places;
  } catch (error) {
    console.error('Error searching Nominatim POI:', error);
    return [];
  }
}

/**
 * Deduplicate results from multiple sources by name and location
 */
function deduplicateResults(places: OSMPlace[]): OSMPlace[] {
  const seen = new Map<string, OSMPlace>();

  for (const place of places) {
    // Create a key based on normalized name and approximate location
    const normalizedName = place.name.toLowerCase().trim();
    // Round coordinates to ~100m precision for deduplication
    const latRounded = Math.round(place.lat * 1000) / 1000;
    const lonRounded = Math.round(place.lon * 1000) / 1000;
    const key = `${normalizedName}|${latRounded}|${lonRounded}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, place);
      continue;
    }

    // Merge contact info if available (prefer Nominatim which has more contact data)
    if (!existing.contact && place.contact) {
      existing.contact = place.contact;
    } else if (existing.contact && place.contact) {
      // Merge contact info, prefer non-empty values
      existing.contact = {
        phone: place.contact.phone || existing.contact.phone,
        email: place.contact.email || existing.contact.email,
        website: place.contact.website || existing.contact.website,
        instagram: place.contact.instagram || existing.contact.instagram,
      };
    }
    // Merge address info if existing is missing fields
    if (existing.address && place.address) {
      existing.address = {
        street: existing.address.street || place.address.street,
        houseNumber: existing.address.houseNumber || place.address.houseNumber,
        postcode: existing.address.postcode || place.address.postcode,
        city: existing.address.city || place.address.city,
        country: existing.address.country || place.address.country,
      };
    } else if (!existing.address && place.address) {
      existing.address = place.address;
    }
  }

  return Array.from(seen.values());
}

/**
 * Map Photon feature to OSMPlace
 */
function mapPhotonToOSMPlace(feature: PhotonFeature): OSMPlace | null {
  const [lon, lat] = feature.geometry.coordinates;
  const props = feature.properties;

  // Determine place type (always returns a value, defaults to 'restaurant')
  const placeType = getPlaceTypeFromPhoton(props);

  // Build address
  const address = {
    street: props.street || undefined,
    houseNumber: props.housenumber || undefined,
    postcode: props.postcode || undefined,
    city: props.city || undefined,
    country: props.country || undefined,
  };

  // Build display name
  const addressParts = [
    address.street && address.houseNumber ? `${address.street} ${address.houseNumber}` : address.street,
    address.postcode,
    address.city,
  ].filter(Boolean);
  
  const displayName = addressParts.length > 0 
    ? `${props.name}, ${addressParts.join(', ')}`
    : props.name;

  // Map OSM type
  const osmTypeMap: Record<string, 'node' | 'way' | 'relation'> = {
    'N': 'node',
    'W': 'way',
    'R': 'relation',
  };

  return {
    id: props.osm_id,
    type: osmTypeMap[props.osm_type] || 'node',
    placeType,
    name: props.name,
    lat,
    lon,
    address: Object.keys(address).some(k => address[k as keyof typeof address]) ? address : undefined,
    contact: undefined, // Photon doesn't provide contact info
    tags: {
      [props.osm_key || '']: props.osm_value || '',
      source: 'photon',
    },
    displayName,
  };
}

/**
 * Determine place type from Foursquare category
 */
function getPlaceTypeFromFoursquare(place: FoursquarePlace): OSMPlaceType {
  const categoryIds = place.categories.map(c => c.id.toString());
  const categoryNames = place.categories.map(c => c.name.toLowerCase());
  const name = place.name.toLowerCase();

  // Check if it's a mosque category
  if (categoryIds.includes(FOURSQUARE_CATEGORY_MOSQUE) || 
      categoryNames.some(c => c.includes('mosque') || c.includes('masjid'))) {
    if (name.includes('islamic center') || name.includes('islamic centre')) {
      return 'islamic_center';
    }
    return 'mosque';
  }

  // Check if it's a halal restaurant
  if (categoryIds.includes(FOURSQUARE_CATEGORY_HALAL_RESTAURANT) ||
      categoryNames.some(c => c.includes('halal'))) {
    // Check if it's fast food
    if (categoryNames.some(c => c.includes('fast food') || c.includes('fast-food'))) {
      return 'fast_food';
    }
    return 'restaurant';
  }

  // Check category names for restaurant types
  if (categoryNames.some(c => c.includes('restaurant'))) {
    return 'restaurant';
  }

  if (categoryNames.some(c => c.includes('fast food') || c.includes('fast-food'))) {
    return 'fast_food';
  }

  if (categoryNames.some(c => c.includes('shop') || c.includes('store'))) {
    return 'shop';
  }

  // Name-based fallback for mosques and islamic centers
  if (
    name.includes('mosque') ||
    name.includes('masjid') ||
    name.includes('moschee') ||
    name.includes('musalla') ||
    name.includes('islamic') ||
    name.includes('islamisches') ||
    name.includes('muslim')
  ) {
    return 'mosque';
  }
  if (
    name.includes('islamic center') ||
    name.includes('islamic centre') ||
    name.includes('islamisches zentrum') ||
    name.includes('islamic community')
  ) {
    return 'islamic_center';
  }

  return 'unknown';
}

/**
 * Map Foursquare place to OSMPlace
 */
function mapFoursquareToOSMPlace(place: FoursquarePlace): OSMPlace {
  const lat = place.geocodes.main.latitude;
  const lon = place.geocodes.main.longitude;
  const placeType = getPlaceTypeFromFoursquare(place);

  // Parse address from location object
  const addressParts = place.location.address?.split(',') || [];
  const street = addressParts[0]?.trim() || place.location.address || undefined;

  const address = {
    street,
    houseNumber: undefined, // Foursquare doesn't provide separate house number
    postcode: place.location.postcode || undefined,
    city: place.location.locality || place.location.region || undefined,
    country: place.location.country || undefined,
  };

  // Build display name
  const addressPartsDisplay = [
    address.street,
    address.postcode,
    address.city,
  ].filter(Boolean);
  
  const displayName = addressPartsDisplay.length > 0 
    ? `${place.name}, ${addressPartsDisplay.join(', ')}`
    : place.name;

  // Use a hash of fsq_id as numeric ID (for compatibility with OSMPlace interface)
  // Foursquare IDs are strings, so we create a numeric hash
  const idHash = place.fsq_id.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const numericId = Math.abs(idHash);

  const phone = place.contact?.phone || place.tel || undefined;
  const email = place.contact?.email || place.email || undefined;
  const website = place.contact?.website || place.website || undefined;
  const instagram = place.social_media?.instagram || undefined;

  return {
    id: numericId,
    type: 'node', // Foursquare places are treated as nodes
    placeType,
    name: place.name,
    lat,
    lon,
    address: Object.keys(address).some(k => address[k as keyof typeof address]) ? address : undefined,
    contact: phone || email || website || instagram ? {
      phone,
      email,
      website,
      instagram,
    } : undefined,
    tags: {
      foursquare_id: place.fsq_id,
      rating: place.rating?.toString() || '',
      source: 'foursquare',
    },
    displayName,
  };
}

/**
 * Search places using Foursquare Places API
 */
async function searchFoursquare(
  query: string,
  cityCoords: { lat: number; lon: number },
  options?: {
    limit?: number;
  }
): Promise<OSMPlace[]> {
  const apiKey = process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY;
  
  // Skip if API key is not configured
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Foursquare API key not configured - add NEXT_PUBLIC_FOURSQUARE_API_KEY to .env.local');
    }
    return [];
  }

  // Validate API key format (basic check - Service API Keys are typically alphanumeric)
  if (apiKey.length < 10) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Foursquare API key seems too short - make sure you copied the full Service API Key (not OAuth Client ID)');
    }
  }

  try {
    // Search for both mosques and halal restaurants
    const categories = `${FOURSQUARE_CATEGORY_MOSQUE},${FOURSQUARE_CATEGORY_HALAL_RESTAURANT}`;
    
  const params = new URLSearchParams({
    query: query.trim(),
    categories,
    ll: `${cityCoords.lat},${cityCoords.lon}`,
    radius: '5000', // 5km radius
    limit: String(options?.limit ?? 10),
    sort: 'DISTANCE',
    fields: 'fsq_id,name,location,geocodes,categories,tel,website,email,social_media',
  });

    const response = await fetch(`${FOURSQUARE_API_URL}?${params.toString()}`, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Log detailed error info in development
      if (process.env.NODE_ENV === 'development') {
        const errorText = await response.text().catch(() => 'Unable to read error');
        let errorMessage = 'Foursquare API error';
        
        if (response.status === 401) {
          errorMessage = '❌ Foursquare Authentication Failed - Invalid API Key';
          console.error(errorMessage, {
            status: response.status,
            error: errorText,
            hint: 'Make sure you\'re using the Service API Key (not OAuth Client ID/Secret)',
            hint2: 'Get it from: https://developer.foursquare.com/ → Your Project → Service API Keys',
            hint3: 'Check that NEXT_PUBLIC_FOURSQUARE_API_KEY is set correctly in .env.local',
          });
        } else {
          console.error('❌ Foursquare API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
        }
      }
      // Don't log errors if it's just missing API key or rate limit (already logged above)
      if (response.status !== 401 && response.status !== 429 && process.env.NODE_ENV !== 'development') {
        console.error('Foursquare API error:', response.status, response.statusText);
      }
      return [];
    }

    const data: FoursquareResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Foursquare returned 0 results for query:', query);
      }
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Foursquare raw results:', data.results.length, 'before filtering');
    }

    // Filter results by query (Foursquare may return broader results)
    // Note: For city-only queries, we might want to return all results in that city
    const searchQueryLower = query.trim().toLowerCase();
    const isCityOnlyQuery = searchQueryLower.length > 2 && !searchQueryLower.includes(' ') && 
                           (searchQueryLower.match(/^[a-zäöüß]+$/i) !== null);
    
    let filteredResults = data.results;
    
    // Only filter if it's not just a city name (city names are usually single words)
    if (!isCityOnlyQuery) {
      filteredResults = data.results.filter(place => {
        const nameMatch = place.name.toLowerCase().includes(searchQueryLower);
        const addressMatch = place.location.address?.toLowerCase().includes(searchQueryLower);
        return nameMatch || addressMatch;
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Foursquare after filtering:', filteredResults.length, 'results');
    }

    // Map Foursquare places to OSMPlace
    const places = filteredResults
      .map(mapFoursquareToOSMPlace)
      .filter((place): place is OSMPlace => place !== null);

    // Console logging for debugging (dev only)
    if (process.env.NODE_ENV === 'development' && places.length > 0) {
      console.log('✅ Foursquare returned', places.length, 'results:', places.map(p => p.name));
    }

    return places;
  } catch (error) {
    console.error('Error searching places with Foursquare:', error);
    return [];
  }
}

/**
 * Search places using Photon API with city location bias
 */
async function searchPhoton(
  query: string,
  cityCoords: { lat: number; lon: number; bbox?: [number, number, number, number] },
  options?: {
    limit?: number;
    lang?: string;
  }
): Promise<OSMPlace[]> {
  // Build Photon API request
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(options?.limit ?? 15),
    lang: options?.lang || 'de',
    lat: String(cityCoords.lat),
    lon: String(cityCoords.lon),
    location_bias_scale: '0.5', // Balance between proximity and relevance
  });

  // Optional: restrict to bounding box if available
  if (cityCoords.bbox) {
    const [minLon, minLat, maxLon, maxLat] = cityCoords.bbox;
    params.set('bbox', `${minLon},${minLat},${maxLon},${maxLat}`);
  }

  try {
    const response = await fetch(`${PHOTON_API_URL}?${params.toString()}`);

    if (!response.ok) {
      console.error('Photon API error:', response.status, response.statusText);
      return [];
    }

    const data = (await response.json()) as PhotonResponse;

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Map Photon features to OSMPlace
    const places = data.features
      .map(mapPhotonToOSMPlace)
      .filter((place): place is OSMPlace => place !== null);

    return places;
  } catch (error) {
    console.error('Error searching places with Photon:', error);
    return [];
  }
}

/**
 * Search places using multiple APIs in parallel with city location bias
 * 
 * @param query - User's search text
 * @param cityName - City name to bias search toward
 * @param options - Additional options
 */
export async function searchPlacesInCity(
  query: string,
  cityName: string,
  options?: {
    limit?: number;
    lang?: string;
  }
): Promise<OSMPlace[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  if (!cityName || !cityName.trim()) {
    return [];
  }

  // Get city coordinates
  const cityCoords = await getCityCoords(cityName);
  if (!cityCoords) {
    return [];
  }

  // Search THREE APIs in parallel
  const [photonResults, nominatimResults, foursquareResults] = await Promise.all([
    searchPhoton(query, cityCoords, options),
    searchNominatimPOI(query, cityCoords),
    searchFoursquare(query, cityCoords, options),
  ]);

  // Console logging for debugging (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Place Search Results:', {
      query,
      city: cityName,
      photon: photonResults.length,
      nominatim: nominatimResults.length,
      foursquare: foursquareResults.length,
      total: photonResults.length + nominatimResults.length + foursquareResults.length,
    });
  }

  const allResults = [...nominatimResults, ...photonResults, ...foursquareResults];
  const filteredResults = allResults.filter((place) =>
    matchesCityFilter(place, cityName, cityCoords.bbox)
  );

  // Merge and deduplicate results
  const merged = deduplicateResults(filteredResults);

  // Limit results
  return merged.slice(0, options?.limit ?? 15);
}
