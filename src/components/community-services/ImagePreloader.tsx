'use client';

import { useEffect } from 'react';

interface ImagePreloaderProps {
  imageUrl: string | null;
}

export function ImagePreloader({ imageUrl }: ImagePreloaderProps) {
  useEffect(() => {
    if (!imageUrl) return;

    // Check if link already exists
    const existingLink = document.querySelector(`link[rel="preload"][href="${imageUrl}"]`);
    if (existingLink) return;

    // Create and append preload link
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageUrl;
    document.head.appendChild(link);

    // Cleanup on unmount
    return () => {
      const linkToRemove = document.querySelector(`link[rel="preload"][href="${imageUrl}"]`);
      if (linkToRemove) {
        linkToRemove.remove();
      }
    };
  }, [imageUrl]);

  return null;
}

