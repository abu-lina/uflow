import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/services/categories';

interface ImageFallbackOptions {
  categoryId: string;
  category?: Category;
  entityType: 'provider' | 'community_service';
  limit?: number;
}

interface ImageFallbackResult {
  images: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for handling image fallback logic with React Query caching
 * Priority: Entity images → Category images → Placeholder images
 * 
 * Best Practice: Uses React Query for caching and leverages cached category data
 * to minimize duplicate fetches while still fetching entity images separately.
 */
export function useImageFallback({
  categoryId,
  category,
  entityType,
  limit = 3,
}: ImageFallbackOptions): ImageFallbackResult {
  const queryClient = useQueryClient();
  
  // Use React Query to cache images per category and entity type
  // Query key includes categoryId to ensure proper cache invalidation
  const { data: images = [], isLoading, error: queryError } = useQuery({
    queryKey: ['gallery-images', entityType, categoryId, limit],
    queryFn: async () => {
      // Try to get category from cache first (better practice than relying on prop)
      let categoryData = category;
      if (!categoryData) {
        const cachedCategories = queryClient.getQueryData<Category[]>(['used-categories']);
        categoryData = cachedCategories?.find(cat => cat.category_id === categoryId);
      }

      // Priority 1: Get entity images (not in category data, requires separate fetch)
        const entityImages = await fetchEntityImages(entityType, categoryId, limit);
        
        if (entityImages.length >= limit) {
        return entityImages.slice(0, limit);
        }

      // Priority 2: Get category fallback images from cached category data
      const categoryImages = parseCategoryImages(categoryData?.category_images);

        // Priority 3: Combine and fill remaining slots
        const combinedImages = [...entityImages];
        while (combinedImages.length < limit && categoryImages.length > 0) {
          const categoryImageIndex = (combinedImages.length - entityImages.length) % categoryImages.length;
          combinedImages.push(categoryImages[categoryImageIndex]);
        }

      return combinedImages;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - images don't change often
    placeholderData: (previousData) => previousData, // Show cached images immediately
    enabled: !!categoryId, // Only run if categoryId exists
  });

  return {
    images,
    loading: isLoading,
    error: queryError ? 'Failed to load images' : null,
  };
}

/**
 * Fetch images from the appropriate entity table
 */
async function fetchEntityImages(
  entityType: 'provider' | 'community_service',
  categoryId: string,
  limit: number
): Promise<string[]> {
  const tableName = entityType === 'provider' ? 'providers' : 'community_services';
  const imageColumn = entityType === 'provider' ? 'provider_images' : 'community_service_images';

  const { data, error } = await supabase
    .from(tableName)
    .select(imageColumn)
    .eq('category_id', categoryId)
    .limit(limit);

  if (error) throw error;

  return data
    .map((item: Record<string, unknown>) => {
      try {
        if (!item[imageColumn]) return null;

        const imageData = item[imageColumn];
        
        // Handle different data formats
        if (typeof imageData === 'string') {
          if (imageData.startsWith('http')) {
            return imageData;
          }
          const parsed = JSON.parse(imageData);
          if (Array.isArray(parsed)) {
            return parsed[0] || null;
          }
          if (parsed.urls && Array.isArray(parsed.urls)) {
            return parsed.urls[0] || null;
          }
          return null;
        }

        if (Array.isArray(imageData)) {
          return imageData[0] || null;
        }

        return null;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => url !== null);
}

/**
 * Parse category images from various data structures
 */
function parseCategoryImages(categoryImages: string | Record<string, unknown> | null | undefined): string[] {
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
