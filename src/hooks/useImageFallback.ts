import { useState, useEffect } from 'react';
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
 * Custom hook for handling image fallback logic
 * Priority: Entity images → Category images → Placeholder images
 */
export function useImageFallback({
  categoryId,
  category,
  entityType,
  limit = 3,
}: ImageFallbackOptions): ImageFallbackResult {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Priority 1: Get entity images
        const entityImages = await fetchEntityImages(entityType, categoryId, limit);
        
        if (entityImages.length >= limit) {
          setImages(entityImages.slice(0, limit));
          return;
        }

        // Priority 2: Get category fallback images
        const categoryImages = parseCategoryImages(category?.category_images);

        // Priority 3: Combine and fill remaining slots
        const combinedImages = [...entityImages];
        while (combinedImages.length < limit && categoryImages.length > 0) {
          const categoryImageIndex = (combinedImages.length - entityImages.length) % categoryImages.length;
          combinedImages.push(categoryImages[categoryImageIndex]);
        }

        setImages(combinedImages);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [categoryId, category, entityType, limit]);

  return { images, loading, error };
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
