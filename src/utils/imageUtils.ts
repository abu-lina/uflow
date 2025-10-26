/**
 * Type definitions for image data structures
 */
export interface ImageData {
  urls?: string[];
}

export interface CategoryImageData {
  urls?: string[];
  url?: string;
}

export type ProviderImages = string | string[] | ImageData | null | undefined;
export type CategoryImages = string | CategoryImageData | null | undefined;

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
export function getFirstImageUrl(providerImages: ProviderImages): string {
  if (!providerImages) return PLACEHOLDER_IMAGE;

  try {
    let imagesData: ImageData = {};
    
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
export function getAllTrustedImageUrls(providerImages: ProviderImages): string[] {
  if (!providerImages) return [];

  try {
    let imagesData: ImageData = {};
    
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
 * Extracts all trusted image URLs with category fallback
 * @param providerImages - The provider_images field from database
 * @param categoryImages - The category_images field from database
 * @returns Array of image URLs with fallback
 */
export function getAllTrustedImageUrlsWithFallback(
  providerImages: ProviderImages,
  categoryImages: CategoryImages
): string[] {
  // Priority 1: Get provider images
  const providerUrls = getAllTrustedImageUrls(providerImages);
  
  // If we have provider images, return them
  if (providerUrls.length > 0) {
    return providerUrls;
  }
  
  // Priority 2: Get category fallback images
  const categoryUrls = parseCategoryImages(categoryImages);
  
  // If we have category images, return them
  if (categoryUrls.length > 0) {
    return categoryUrls;
  }
  
  // Priority 3: Return empty array (will fallback to placeholder in component)
  return [];
}

/**
 * Parse category images from various data structures
 */
function parseCategoryImages(categoryImages: CategoryImages): string[] {
  if (!categoryImages) return [];

  try {
    let parsedImages: unknown;

    if (typeof categoryImages === 'string') {
      parsedImages = JSON.parse(categoryImages);
    } else {
      parsedImages = categoryImages;
    }

    // Handle array of URLs
    if (Array.isArray(parsedImages)) {
      return parsedImages.filter((item): item is string => typeof item === 'string');
    }

    // Handle object with urls property
    if (
      typeof parsedImages === 'object' &&
      parsedImages !== null &&
      'urls' in parsedImages &&
      Array.isArray((parsedImages as { urls: unknown }).urls)
    ) {
      return (parsedImages as { urls: string[] }).urls;
    }

    // Handle object with single url property
    if (
      typeof parsedImages === 'object' &&
      parsedImages !== null &&
      'url' in parsedImages &&
      typeof (parsedImages as { url: unknown }).url === 'string'
    ) {
      return [(parsedImages as { url: string }).url];
    }

    return [];
  } catch {
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