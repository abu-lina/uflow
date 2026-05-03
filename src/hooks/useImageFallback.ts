import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/services/categories';
import { getCategoryStaticImageUrl } from '@/utils/categoryImages';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

interface ImageFallbackOptions {
  categoryId: string;
  category?: Category;
  entityType?: 'provider'; // M-5a: community_service_images dropped; all entities use providers
  limit?: number;
}

interface ImageFallbackResult {
  images: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for handling image fallback logic with React Query caching
 * Priority: Provider images -> Category static images -> Placeholder image
 * 
 * Best Practice: Uses React Query for caching and leverages cached category data
 * to minimize duplicate fetches while still fetching entity images separately.
 */
export function useImageFallback({
  categoryId,
  category: _category,
  entityType,
  limit = 3,
}: ImageFallbackOptions): ImageFallbackResult {

  // Use React Query to cache images per category and entity type
  // Query key includes categoryId to ensure proper cache invalidation
  const { data: images = [], isLoading, error: queryError } = useQuery({
    queryKey: ['gallery-images', entityType, categoryId, limit],
    queryFn: async () => {
      const entityImages = await fetchEntityImages(entityType, categoryId, limit);
      if (entityImages.length >= limit) {
        return entityImages.slice(0, limit);
      }

      return entityImages;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - images don't change often
    placeholderData: (previousData) => previousData, // Show cached images immediately
    enabled: !!categoryId, // Only run if categoryId exists
  });

  return {
    images,
    loading: isLoading,
    error: queryError ? 'providers.failedToLoadImages' : null,
  };
}

/**
 * Fetch images from the appropriate entity table
 */
// M-5a: community_services table dropped; always fetch from providers
async function fetchEntityImages(
  _entityType: 'provider' | undefined,
  categoryId: string,
  limit: number
): Promise<string[]> {
  const tableName = 'providers';
  const imageColumn = 'provider_images';

  const { data, error } = await supabase
    .from(tableName)
    .select(`provider_id,${imageColumn}`)
    .eq('category_id', categoryId)
    .order('provider_id', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return data
    .map((item: Record<string, unknown>) => {
      const providerId = typeof item.provider_id === 'string' ? item.provider_id : '';
      return resolveGalleryImage(item[imageColumn], categoryId, providerId);
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

export function resolveGalleryImage(
  providerImages: unknown,
  categoryId: string,
  providerId: string,
): string {
  const providerImageUrl = extractFirstProviderImageUrl(providerImages);
  if (providerImageUrl) {
    return providerImageUrl;
  }

  const categoryImageUrl = getCategoryStaticImageUrl(categoryId, providerId);
  if (categoryImageUrl) {
    return categoryImageUrl;
  }

  return PLACEHOLDER_IMAGE;
}

function extractFirstProviderImageUrl(providerImages: unknown): string | null {
  try {
    if (!providerImages) return null;

    if (typeof providerImages === 'string') {
      if (providerImages.startsWith('http')) {
        return providerImages;
      }

      const parsed = JSON.parse(providerImages);
      if (Array.isArray(parsed)) {
        return typeof parsed[0] === 'string' ? parsed[0] : null;
      }
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'urls' in parsed &&
        Array.isArray((parsed as { urls?: unknown }).urls)
      ) {
        const firstUrl = (parsed as { urls: unknown[] }).urls[0];
        return typeof firstUrl === 'string' ? firstUrl : null;
      }
      return null;
    }

    if (Array.isArray(providerImages)) {
      return typeof providerImages[0] === 'string' ? providerImages[0] : null;
    }

    if (
      typeof providerImages === 'object' &&
      providerImages !== null &&
      'urls' in providerImages &&
      Array.isArray((providerImages as { urls?: unknown }).urls)
    ) {
      const firstUrl = (providerImages as { urls: unknown[] }).urls[0];
      return typeof firstUrl === 'string' ? firstUrl : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse category images from various data structures
 */
export function parseCategoryImages(categoryImages: string | Record<string, unknown> | null | undefined): string[] {
  if (!categoryImages) return [];

  try {
    let parsedImages;

    if (typeof categoryImages === 'string') {
      parsedImages = JSON.parse(categoryImages);
    } else {
      parsedImages = categoryImages;
    }

    if (Array.isArray(parsedImages)) {
      return parsedImages;
    }

    if (parsedImages.urls && Array.isArray(parsedImages.urls)) {
      return parsedImages.urls;
    }

    if (parsedImages.url) {
      return [parsedImages.url];
    }

    return [];
  } catch {
    return [];
  }
}
