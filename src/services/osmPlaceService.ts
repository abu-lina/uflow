/**
 * OpenStreetMap Place Service
 * 
 * Searches for Muslim places (mosques, halal restaurants, shops) using Overpass API
 */

import type { OSMPlace, OSMPlaceType, OverpassResponse, OverpassElement } from '@/types/osm';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_TIMEOUT = 25; // seconds

/**
 * Get city bounding box using Nominatim
 */
async function getCityBounds(cityName: string): Promise<{ bbox: [number, number, number, number]; center: [number, number] } | null> {
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

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    const bbox = result.boundingbox; // [min_lat, max_lat, min_lon, max_lon]
    
    if (!bbox || bbox.length !== 4) {
      return null;
    }

    return {
      bbox: [parseFloat(bbox[2]), parseFloat(bbox[0]), parseFloat(bbox[3]), parseFloat(bbox[1])], // [min_lon, min_lat, max_lon, max_lat]
      center: [parseFloat(result.lon), parseFloat(result.lat)],
    };
  } catch (error) {
    console.error('Error getting city bounds:', error);
    return null;
  }
}

/**
 * Determine place type from OSM tags
 */
function getPlaceType(tags: Record<string, string>): OSMPlaceType | null {
  // Mosque
  if (tags.amenity === 'place_of_worship' && tags.religion === 'muslim') {
    return 'mosque';
  }

  // Islamic center (mosque with community center)
  if (tags.amenity === 'community_centre' && tags.religion === 'muslim') {
    return 'islamic_center';
  }

  // Halal restaurant
  if (tags.amenity === 'restaurant' && (
    tags['diet:halal'] === 'yes' || 
    tags['diet:halal'] === 'only' || 
    tags.cuisine === 'halal' ||
    tags.cuisine === 'turkish' ||
    tags.cuisine === 'middle_eastern' ||
    tags.cuisine === 'arab'
  )) {
    return 'restaurant';
  }

  // Halal fast food
  if (tags.amenity === 'fast_food' && (
    tags['diet:halal'] === 'yes' || 
    tags['diet:halal'] === 'only' ||
    tags.cuisine === 'halal'
  )) {
    return 'fast_food';
  }

  // Halal shop
  if (tags.shop && tags['diet:halal'] === 'yes') {
    return 'shop';
  }

  return null;
}

/**
 * Parse Overpass element to OSMPlace
 */
function parseOSMElement(element: OverpassElement): OSMPlace | null {
  const placeType = getPlaceType(element.tags);
  if (!placeType) {
    return null;
  }

  // Get coordinates (use center for ways/relations, lat/lon for nodes)
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  
  if (!lat || !lon) {
    return null;
  }

  // Get name
  const name = element.tags.name || element.tags['name:de'] || element.tags['name:en'] || 'Unnamed Place';
  
  // Parse address
  const address = {
    street: element.tags['addr:street'] || undefined,
    houseNumber: element.tags['addr:housenumber'] || undefined,
    postcode: element.tags['addr:postcode'] || undefined,
    city: element.tags['addr:city'] || element.tags['addr:town'] || element.tags['addr:village'] || undefined,
    country: element.tags['addr:country'] || undefined,
  };

  // Parse contact info
  const contact = {
    phone: element.tags.phone || element.tags['contact:phone'] || undefined,
    email: element.tags.email || element.tags['contact:email'] || undefined,
    website: element.tags.website || element.tags['contact:website'] || undefined,
    instagram: element.tags.instagram || element.tags['contact:instagram'] || undefined,
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

  return {
    id: element.id,
    type: element.type,
    placeType,
    name,
    lat,
    lon,
    address: Object.keys(address).some(k => address[k as keyof typeof address]) ? address : undefined,
    contact: Object.keys(contact).some(k => contact[k as keyof typeof contact]) ? contact : undefined,
    tags: element.tags,
    displayName,
  };
}

/**
 * Search for Muslim places in a city by name query
 */
export async function searchMuslimPlaces(
  query: string,
  cityName: string
): Promise<OSMPlace[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  if (!cityName || !cityName.trim()) {
    return [];
  }

  // Get city bounds
  const cityBounds = await getCityBounds(cityName);
  if (!cityBounds) {
    return [];
  }

  const [minLon, minLat, maxLon, maxLat] = cityBounds.bbox;
  const searchQuery = query.trim().toLowerCase();

  // Build Overpass QL query
  // Get all Muslim places within city bounds, then filter by name client-side
  // (Overpass QL doesn't support complex regex filters)
  const overpassQuery = `
    [out:json][timeout:${OVERPASS_TIMEOUT}][bbox:${minLat},${minLon},${maxLat},${maxLon}];
    (
      // Mosques
      nwr["amenity"="place_of_worship"]["religion"="muslim"];
      
      // Islamic centers
      nwr["amenity"="community_centre"]["religion"="muslim"];
      
      // Halal restaurants
      nwr["amenity"="restaurant"]["diet:halal"~"^(yes|only)$"];
      nwr["amenity"="restaurant"]["cuisine"="halal"];
      
      // Halal fast food
      nwr["amenity"="fast_food"]["diet:halal"~"^(yes|only)$"];
      nwr["amenity"="fast_food"]["cuisine"="halal"];
      
      // Halal shops
      nwr["shop"]["diet:halal"="yes"];
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status, response.statusText);
      return [];
    }

    const data: OverpassResponse = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    // Parse results
    const allPlaces = data.elements
      .map(parseOSMElement)
      .filter((place): place is OSMPlace => place !== null);

    // Filter by search query (case-insensitive)
    // Check name, name:de, name:en, and display name
    const filteredPlaces = allPlaces.filter(place => {
      const nameMatch = place.name.toLowerCase().includes(searchQuery);
      const nameDeMatch = place.tags['name:de']?.toLowerCase().includes(searchQuery);
      const nameEnMatch = place.tags['name:en']?.toLowerCase().includes(searchQuery);
      const displayNameMatch = place.displayName?.toLowerCase().includes(searchQuery);
      
      return nameMatch || nameDeMatch || nameEnMatch || displayNameMatch;
    });

    // Limit to 20 results
    return filteredPlaces.slice(0, 20);
  } catch (error) {
    console.error('Error searching OSM places:', error);
    return [];
  }
}

/**
 * Get all Muslim places in a city (no search query)
 */
export async function getMuslimPlacesByCity(
  cityName: string,
  limit: number = 50
): Promise<OSMPlace[]> {
  if (!cityName || !cityName.trim()) {
    return [];
  }

  // Get city bounds
  const cityBounds = await getCityBounds(cityName);
  if (!cityBounds) {
    return [];
  }

  const [minLon, minLat, maxLon, maxLat] = cityBounds.bbox;

  // Build Overpass QL query - get all Muslim places
  const overpassQuery = `
    [out:json][timeout:${OVERPASS_TIMEOUT}][bbox:${minLat},${minLon},${maxLat},${maxLon}];
    (
      // Mosques
      nwr["amenity"="place_of_worship"]["religion"="muslim"];
      
      // Islamic centers
      nwr["amenity"="community_centre"]["religion"="muslim"];
      
      // Halal restaurants
      nwr["amenity"="restaurant"]["diet:halal"~"^(yes|only)$"];
      nwr["amenity"="restaurant"]["cuisine"="halal"];
      
      // Halal fast food
      nwr["amenity"="fast_food"]["diet:halal"~"^(yes|only)$"];
      nwr["amenity"="fast_food"]["cuisine"="halal"];
      
      // Halal shops
      nwr["shop"]["diet:halal"="yes"];
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status, response.statusText);
      return [];
    }

    const data: OverpassResponse = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    // Parse and filter results
    const places = data.elements
      .map(parseOSMElement)
      .filter((place): place is OSMPlace => place !== null)
      .slice(0, limit);

    return places;
  } catch (error) {
    console.error('Error fetching OSM places:', error);
    return [];
  }
}
