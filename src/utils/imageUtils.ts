/**
 * Utility functions for processing provider images
 */

export interface ImageData {
  urls?: string[];
}

export const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

/**
 * Processes provider images and returns an array of valid image URLs
 * @param providerImages - The raw provider images data
 * @returns Array of image URLs, falls back to placeholder if none valid
 */
export function processProviderImages(providerImages: unknown): string[] {
  try {
    if (!providerImages) {
      return [PLACEHOLDER_IMAGE];
    }

    let imagesData: ImageData = {};
    
    if (typeof providerImages === 'string') {
      try {
        imagesData = JSON.parse(providerImages) as ImageData;
      } catch {
        imagesData = {};
      }
    } else if (Array.isArray(providerImages)) {
      imagesData.urls = providerImages;
    } else if (isImageData(providerImages)) {
      imagesData = providerImages;
    }

    if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
      return imagesData.urls;
    }
    
    return [PLACEHOLDER_IMAGE];
  } catch {
    return [PLACEHOLDER_IMAGE];
  }
}

/**
 * Type guard to check if an object has the expected image data structure
 */
function isImageData(obj: unknown): obj is ImageData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'urls' in obj &&
    Array.isArray((obj as ImageData).urls) &&
    (obj as ImageData).urls?.every((url) => typeof url === 'string') === true
  );
}

/**
 * Checks if a URL is from a trusted domain (Supabase)
 */
export function isTrustedImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return hostname === supabaseUrl.hostname;
  } catch {
    return false;
  }
}

/**
 * Filters image URLs to only include trusted sources
 */
export function filterTrustedImages(urls: string[]): string[] {
  const trusted = urls.filter(isTrustedImageUrl);
  return trusted.length > 0 ? trusted : [PLACEHOLDER_IMAGE];
}

/**
 * Gets the first image URL from provider images, with fallback
 */
export function getFirstImageUrl(providerImages: unknown): string {
  const urls = processProviderImages(providerImages);
  return urls[0] || PLACEHOLDER_IMAGE;
}

/**
 * Gets all trusted image URLs from provider images
 */
export function getAllTrustedImageUrls(providerImages: unknown): string[] {
  const urls = processProviderImages(providerImages);
  return filterTrustedImages(urls);
}