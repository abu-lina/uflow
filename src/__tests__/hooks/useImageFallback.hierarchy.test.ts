import { describe, expect, it } from 'vitest';

import { resolveGalleryImage } from '@/hooks/useImageFallback';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

const STORAGE_BASE =
  'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images';
const TURKISH_ID = '232c2870-7929-43eb-a909-6cac90203192';

/** JSONB shape as returned by categories.category_images */
const TURKISH_CATEGORY_IMAGES = {
  urls: [
    `${STORAGE_BASE}/${TURKISH_ID}/1.webp`,
    `${STORAGE_BASE}/${TURKISH_ID}/2.webp`,
    `${STORAGE_BASE}/${TURKISH_ID}/3.webp`,
  ],
};

describe('resolveGalleryImage hierarchy', () => {
  it('uses provider-owned image first when present', () => {
    const providerImage = JSON.stringify({ urls: ['https://cdn.example.com/provider.webp'] });

    const resolved = resolveGalleryImage(providerImage, TURKISH_CATEGORY_IMAGES, 'provider-1');

    expect(resolved).toBe('https://cdn.example.com/provider.webp');
  });

  it('[TDD] falls back to Supabase Storage URL when provider image is missing', () => {
    // Post-fix: resolveGalleryImage accepts categoryImages JSONB, picks deterministically
    const resolved = resolveGalleryImage(null, TURKISH_CATEGORY_IMAGES, 'provider-2');

    expect(resolved).toMatch(/^https:\/\/.*supabase\.co\/storage\/v1\/object\/public\/category-images\//);
    expect(resolved).toMatch(/\.webp$/);
    expect(resolved).not.toContain('/images/categories/');
  });

  it('[TDD] same provider always gets the same image (deterministic)', () => {
    const r1 = resolveGalleryImage(null, TURKISH_CATEGORY_IMAGES, 'provider-2');
    const r2 = resolveGalleryImage(null, TURKISH_CATEGORY_IMAGES, 'provider-2');

    expect(r1).toBe(r2);
  });

  it('[TDD] different providers can get different images (varied)', () => {
    const results = ['p1', 'p2', 'p3', 'p4', 'p5'].map((pid) =>
      resolveGalleryImage(null, TURKISH_CATEGORY_IMAGES, pid),
    );
    // Not all the same (distribution across 3 URLs for 5 providers)
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('falls back to placeholder when category has no images', () => {
    const resolved = resolveGalleryImage(null, null, 'provider-3');

    expect(resolved).toBe(PLACEHOLDER_IMAGE);
  });

  it('falls back to placeholder when provider image is invalid and category has no images', () => {
    const resolved = resolveGalleryImage('not-json', null, 'provider-4');

    expect(resolved).toBe(PLACEHOLDER_IMAGE);
  });

  it('[TDD] accepts stringified JSONB (as returned by some DB drivers)', () => {
    const stringifiedImages = JSON.stringify(TURKISH_CATEGORY_IMAGES);
    const resolved = resolveGalleryImage(null, stringifiedImages, 'provider-5');

    expect(resolved).toMatch(/\.webp$/);
    expect(resolved).not.toContain('/images/categories/');
  });
});
