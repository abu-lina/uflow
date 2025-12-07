'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/services/categories';

interface CategoryGalleryProps {
  categoryId: string;
  category?: Category; // Optional category data for fallback images
}

interface ProviderImage {
  provider_images: string | null;
}

export default function CategoryGallery({ categoryId, category }: CategoryGalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        console.log('CategoryGallery received category:', category);
        
        // Priority 1: Get provider images
        const { data: providersData, error: providersError } = await supabase
          .from('providers')
          .select('provider_images')
          .eq('category_id', categoryId)
          .limit(3);

        if (providersError) throw providersError;

        const providerImages = providersData
          .map((item: ProviderImage) => {
            try {
              if (!item.provider_images) return null;
              const parsed = JSON.parse(item.provider_images) as { urls?: string[] };
              return parsed.urls?.[0] || null;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => url !== null);

        console.log('Provider images:', providerImages); // Debug log

        // If we have enough provider images, use them
        if (providerImages.length >= 3) {
          setImages(providerImages.slice(0, 3));
          return;
        }

        // Priority 2: Get category fallback images
        const categoryImages: string[] = [];
        console.log(`Category ${categoryId} - category_images check:`, category?.category_images);
        
        if (category?.category_images) {
          console.log(`Category ${categoryId} - Raw category_images:`, category.category_images);
          try {
            // Handle different possible data structures
            let parsedCategoryImages;
            
            if (typeof category.category_images === 'string') {
              parsedCategoryImages = JSON.parse(category.category_images);
            } else {
              parsedCategoryImages = category.category_images;
            }
            
            console.log(`Category ${categoryId} - Parsed category images:`, parsedCategoryImages);
            
            // Handle different possible structures
            if (Array.isArray(parsedCategoryImages)) {
              // Direct array of URLs
              categoryImages.push(...parsedCategoryImages);
              console.log(`Category ${categoryId} - Added array URLs:`, parsedCategoryImages);
            } else if (parsedCategoryImages.urls && Array.isArray(parsedCategoryImages.urls)) {
              // Object with urls property
              categoryImages.push(...parsedCategoryImages.urls);
              console.log(`Category ${categoryId} - Added urls property:`, parsedCategoryImages.urls);
            } else if (parsedCategoryImages.url) {
              // Single URL
              categoryImages.push(parsedCategoryImages.url);
              console.log(`Category ${categoryId} - Added single URL:`, parsedCategoryImages.url);
            }
          } catch (err) {
            console.warn(`Category ${categoryId} - Error parsing category images:`, err);
          }
        } else {
          console.log(`Category ${categoryId} - No category_images available`);
        }

        // Combine provider images with category images
        const combinedImages = [...providerImages];
        
        // Fill remaining slots with category images (repeat if necessary)
        while (combinedImages.length < 3 && categoryImages.length > 0) {
          const categoryImageIndex = (combinedImages.length - providerImages.length) % categoryImages.length;
          combinedImages.push(categoryImages[categoryImageIndex]);
        }

        console.log(`Category ${categoryId} - Provider images:`, providerImages);
        console.log(`Category ${categoryId} - Category images:`, categoryImages);
        console.log(`Category ${categoryId} - Combined images:`, combinedImages);
        setImages(combinedImages);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [categoryId, category]);

  // Always ensure we have exactly 3 images
  const displayImages = [...images];
  while (displayImages.length < 3) {
    displayImages.push('/images/placeholder.jpg');
  }

  console.log('Final display images:', displayImages);

  if (loading) {
    return (
      <div className="flex aspect-[16/9] min-h-[240px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`relative h-full w-1/3 animate-pulse overflow-hidden border border-white bg-gray-200 ${i === 0 ? 'rounded-l-[29px]' : ''} ${i === 2 ? 'rounded-r-[29px]' : ''}`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 md:hidden">{error}</div>;
  }

  return (
    <div className="flex aspect-[16/9] min-h-[240px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
      {displayImages.slice(0, 3).map((imageUrl, index) => (
        <div
          key={index}
          className={`relative h-full w-1/3 overflow-hidden ${index === 0 ? 'rounded-l-[29px]' : ''} ${index === 2 ? 'rounded-r-[29px]' : ''}`}
        >
          <Image
            fill
            alt={
              imageUrl === '/images/placeholder.jpg'
                ? `Placeholder image ${index + 1}`
                : imageUrl.includes('provider-images') || imageUrl.includes('providers')
                ? `Provider image ${index + 1}`
                : `Category image ${index + 1}`
            }
            className={`border border-white object-cover ${index === 0 ? 'rounded-l-[29px]' : ''} ${index === 2 ? 'rounded-r-[29px]' : ''}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            priority={index === 0}
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, 33vw"
            src={imageUrl}
          />
        </div>
      ))}
    </div>
  );
}
