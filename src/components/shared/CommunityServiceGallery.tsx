'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

interface CommunityServiceImage {
  community_service_images: string | null;
}

export default function CommunityServiceGallery() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('community_services')
          .select('community_service_images')
          .limit(3);

        if (error) throw error;

        const validImages = data
          .map((item: CommunityServiceImage) => {
            try {
              if (!item.community_service_images) return null;

              // Handle different data formats
              if (typeof item.community_service_images === 'string') {
                // If it's a direct URL string
                if (item.community_service_images.startsWith('http')) {
                  return item.community_service_images;
                }
                // If it's a JSON string
                const parsed = JSON.parse(item.community_service_images);
                if (Array.isArray(parsed)) {
                  return parsed[0] || null;
                }
                if (parsed.urls && Array.isArray(parsed.urls)) {
                  return parsed.urls[0] || null;
                }
                return null;
              }

              // If it's already an array
              if (Array.isArray(item.community_service_images)) {
                return item.community_service_images[0] || null;
              }

              return null;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => url !== null);

        console.log('Fetched community service images:', validImages); // Debug log
        setImages(validImages);
      } catch (err) {
        console.error('Error fetching community service images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Always ensure we have exactly 3 images
  const displayImages = [...images];
  while (displayImages.length < 3) {
    displayImages.push('/images/placeholder.jpg');
  }

  console.log('Display community service images:', displayImages); // Debug log

  if (loading) {
    return (
      <div className="flex aspect-[16/9] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
        <div
          className="flex h-full w-full overflow-hidden rounded-[29px]"
          style={{
            background:
              'linear-gradient(white, white) padding-box, linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%) border-box',
            border: '1px solid transparent',
            borderRadius: '29px',
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`relative h-full w-1/3 animate-pulse overflow-hidden bg-gray-200 ${i === 0 ? 'rounded-l-[29px]' : ''} ${i === 2 ? 'rounded-r-[29px]' : ''}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 md:hidden">{error}</div>;
  }

  return (
    <div className="flex aspect-[16/9] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]">
      <div
        className="flex h-full w-full overflow-hidden rounded-[29px]"
        style={{
          background:
            'linear-gradient(white, white) padding-box, linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%) border-box',
          border: '1px solid transparent',
          borderRadius: '29px',
        }}
      >
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
                  : `Community service image ${index + 1}`
              }
              className={`object-cover ${index === 0 ? 'rounded-l-[29px]' : ''} ${index === 2 ? 'rounded-r-[29px]' : ''}`}
              priority={index < 2}
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, 33vw"
              src={imageUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
