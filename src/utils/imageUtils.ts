/**
 * Utility functions for handling image URLs and processing
 */

export const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

/**
 * Extracts the first image URL from provider_images data
 * Handles multiple formats: string (JSON), array, or object
 * @param providerImages - The provider_images field from database
 * @returns First image URL or placeholder
 */
export function getFirstImageUrl(providerImages: string | string[] | { urls?: string[] } | null | undefined): string {
  if (!providerImages) return PLACEHOLDER_IMAGE;

  try {
    let imagesData: { urls?: string[] } = {};
    
    if (typeof providerImages === 'string') {
      imagesData = JSON.parse(providerImages);
    } else if (Array.isArray(providerImages)) {
      imagesData.urls = providerImages;
    } else if (
      typeof providerImages === 'object' &&
      providerImages !== null &&
      'urls' in providerImages
    ) {
      imagesData = providerImages;
    }
    
    if (imagesData.urls && imagesData.urls.length > 0) {
      return imagesData.urls[0];
    }
  } catch (error) {
    console.error('Error parsing provider images:', error);
    return PLACEHOLDER_IMAGE;
  }
  
  return PLACEHOLDER_IMAGE;
}

/**
 * Extracts all trusted image URLs from provider_images data
 * @param providerImages - The provider_images field from database
 * @returns Array of image URLs
 */
export function getAllTrustedImageUrls(providerImages: string | string[] | { urls?: string[] } | null | undefined): string[] {
  if (!providerImages) return [];

  try {
    let imagesData: { urls?: string[] } = {};
    
    if (typeof providerImages === 'string') {
      imagesData = JSON.parse(providerImages);
    } else if (Array.isArray(providerImages)) {
      imagesData.urls = providerImages;
    } else if (
      typeof providerImages === 'object' &&
      providerImages !== null &&
      'urls' in providerImages
    ) {
      imagesData = providerImages;
    }
    
    return imagesData.urls || [];
  } catch (error) {
    console.error('Error parsing provider images:', error);
    return [];
  }
}

/**
 * Formats address components into a single display string
 * @param street - Street address
 * @param city - City name
 * @returns Formatted address string or "Online" if no location data
 */
export function formatProviderAddress(street?: string | null, city?: string | null): string {
  // If no city, it's an online business
  if (!city) {
    return 'Online';
  }
  
  // If we have both street and city, show both
  if (street && city) {
    return `${street}, ${city}`;
  }
  
  // If only city, show just the city
  return city;
}
