'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

interface CategoryGalleryProps {
  categoryId: string;
}

interface ProviderImage {
  provider_images: string | null;
}

export default function CategoryGallery({ categoryId }: CategoryGalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('provider_images')
          .eq('category_id', categoryId)
          .limit(3);

        if (error) throw error;

        const validImages = data
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

        console.log('Fetched images:', validImages); // Debug log
        setImages(validImages);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [categoryId]);

  // Always ensure we have exactly 3 images
  const displayImages = [...images];
  while (displayImages.length < 3) {
    displayImages.push('/images/placeholder.jpg');
  }

  console.log('Display images:', displayImages); // Debug log

  if (loading) {
    return (
      <div className="flex aspect-[16/9] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
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
    <div className="flex aspect-[16/9] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
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
                : `Provider image ${index + 1}`
            }
            className={`border border-white object-cover ${index === 0 ? 'rounded-l-[29px]' : ''} ${index === 2 ? 'rounded-r-[29px]' : ''}`}
            priority={index < 2}
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, 33vw"
            src={imageUrl}
          />
        </div>
      ))}
    </div>
  );
}
