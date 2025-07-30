'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { supabase } from '@/lib/supabase/client';

interface ZakatImage {
  zakat_images: string | null;
}

export default function ZakatGallery() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('zakat_projects')
          .select('zakat_images')
          .limit(4);

        if (error) throw error;

        const validImages = data
          .map((item: ZakatImage) => {
            try {
              if (!item.zakat_images) return null;

              // Handle different data formats
              if (typeof item.zakat_images === 'string') {
                // If it's a direct URL string
                if (item.zakat_images.startsWith('http')) {
                  return item.zakat_images;
                }
                // If it's a JSON string
                const parsed = JSON.parse(item.zakat_images);
                if (Array.isArray(parsed)) {
                  return parsed[0] || null;
                }
                if (parsed.urls && Array.isArray(parsed.urls)) {
                  return parsed.urls[0] || null;
                }
                return null;
              }

              // If it's already an array
              if (Array.isArray(item.zakat_images)) {
                return item.zakat_images[0] || null;
              }

              return null;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => url !== null);

        console.log('Fetched zakat images:', validImages); // Debug log
        setImages(validImages);
      } catch (err) {
        console.error('Error fetching zakat images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Always ensure we have exactly 4 images
  const displayImages = [...images];
  while (displayImages.length < 4) {
    displayImages.push('/images/placeholder.jpg');
  }

  console.log('Display zakat images:', displayImages); // Debug log

  if (loading) {
    return (
      <div className="relative flex aspect-[16/7] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/7] md:hidden md:aspect-[16/8]">
        {/* Golden gradient border using pseudo-element */}
        <div className="absolute inset-0 rounded-[29px] bg-gold-gradient" />
        <div className="relative z-10 m-[1px] flex h-full w-full overflow-hidden rounded-[28px] bg-white">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`relative h-full w-1/4 animate-pulse overflow-hidden bg-gray-200 ${i === 0 ? 'rounded-l-[28px]' : ''} ${i === 3 ? 'rounded-r-[28px]' : ''}`}
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
    <div className="relative flex aspect-[16/7] min-h-[162px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/7] md:hidden md:aspect-[16/8]">
      {/* Golden gradient border using pseudo-element */}
      <div className="absolute inset-0 rounded-[29px] bg-gold-gradient" />
      <div className="relative z-10 m-[1px] flex h-full w-full overflow-hidden rounded-[28px] bg-white">
        {displayImages.slice(0, 4).map((imageUrl, index) => (
          <div
            key={index}
            className={`relative h-full w-1/4 overflow-hidden ${index === 0 ? 'rounded-l-[28px]' : ''} ${index === 3 ? 'rounded-r-[28px]' : ''}`}
          >
            <Image
              fill
              alt={
                imageUrl === '/images/placeholder.jpg'
                  ? `Placeholder image ${index + 1}`
                  : `Zakat project image ${index + 1}`
              }
              className={`object-cover ${index === 0 ? 'rounded-l-[28px]' : ''} ${index === 3 ? 'rounded-r-[28px]' : ''}`}
              priority={index < 2}
              sizes="(max-width: 640px) 25vw, (max-width: 768px) 33vw, 25vw"
              src={imageUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
