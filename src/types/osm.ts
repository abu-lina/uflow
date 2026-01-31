/**
 * OpenStreetMap types for Muslim places import feature
 */

export type OSMPlaceType =
  | 'mosque'
  | 'restaurant'
  | 'shop'
  | 'fast_food'
  | 'islamic_center'
  | 'unknown';

export type OSMElementType = 'node' | 'way' | 'relation';

export interface OSMPlace {
  id: number;
  type: OSMElementType;
  placeType: OSMPlaceType;
  name: string;
  lat: number;
  lon: number;
  address?: {
    street?: string;
    houseNumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  };
  tags: Record<string, string>;
  displayName?: string;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: OSMElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags: Record<string, string>;
}

/**
 * Photon API response types
 */
export interface PhotonResponse {
  features: PhotonFeature[];
}

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
    type: 'Point';
  };
  properties: {
    osm_id: number;
    osm_type: 'N' | 'W' | 'R'; // Node, Way, Relation
    name: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
    [key: string]: unknown; // Allow additional properties
  };
}

/**
 * Nominatim POI search result types
 */
export interface NominatimPOIResult {
  place_id: number;
  osm_id: string;
  osm_type: string;
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  extratags?: {
    phone?: string;
    'contact:phone'?: string;
    email?: string;
    'contact:email'?: string;
    website?: string;
    'contact:website'?: string;
    opening_hours?: string;
    [key: string]: string | undefined;
  };
  namedetails?: {
    name?: string;
    'name:de'?: string;
    'name:en'?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Foursquare Places API response types (updated for 2025-06-17 API)
 */
export interface FoursquarePlace {
  fsq_place_id: string; // Changed from fsq_id
  name: string;
  location: {
    address?: string;
    locality?: string;
    postcode?: string;
    region?: string;
    country?: string;
  };
  // New field structure - geocodes replaced with latitude/longitude
  latitude: number;
  longitude: number;
  categories: Array<{
    id: string; // Changed from number to string (BSON category ID)
    name: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  tel?: string;
  email?: string;
  website?: string;
  social_media?: {
    instagram?: string;
  };
  rating?: number;
}

export interface FoursquareResponse {
  results: FoursquarePlace[];
}
