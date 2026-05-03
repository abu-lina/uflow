import { describe, expect, it } from 'vitest';

import { resolveGalleryImage } from '@/hooks/useImageFallback';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

describe('resolveGalleryImage hierarchy', () => {
  const CATEGORY_WITH_STATIC_IMAGES = '232c2870-7929-43eb-a909-6cac90203192'; // Turkish (real DB ID)
  const CATEGORY_WITHOUT_STATIC_IMAGES = '20c10efe-404b-4a39-bb81-5089a0332d78';

  it('uses provider-owned image first when present', () => {
    const providerImage = JSON.stringify({ urls: ['https://cdn.example.com/provider.webp'] });

    const resolved = resolveGalleryImage(
      providerImage,
      CATEGORY_WITH_STATIC_IMAGES,
      'provider-1',
    );

    expect(resolved).toBe('https://cdn.example.com/provider.webp');
  });

  it('falls back to category static image when provider image is missing', () => {
    const resolved = resolveGalleryImage(null, CATEGORY_WITH_STATIC_IMAGES, 'provider-2');

    expect(resolved).toContain('/images/categories/food/turkish/');
    expect(resolved.endsWith('.png')).toBe(true);
  });

  it('falls back to placeholder when provider and category images are missing', () => {
    const resolved = resolveGalleryImage(null, CATEGORY_WITHOUT_STATIC_IMAGES, 'provider-3');

    expect(resolved).toBe(PLACEHOLDER_IMAGE);
  });

  it('uses placeholder when provider image payload is invalid and category has no images', () => {
    const resolved = resolveGalleryImage('not-json', CATEGORY_WITHOUT_STATIC_IMAGES, 'provider-4');

    expect(resolved).toBe(PLACEHOLDER_IMAGE);
  });
});
