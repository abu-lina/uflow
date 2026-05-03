import { describe, expect, it } from 'vitest';

import {
  CATEGORY_IMAGE_POOL,
  createImageCandidatePayload,
  resolveCategoryImageQueries,
  selectDeterministicPoolImage,
} from '@/lib/enrichment/image-enrichment';

describe('CATEGORY_IMAGE_POOL', () => {
  it('contains all approved category mappings', () => {
    expect(Object.keys(CATEGORY_IMAGE_POOL)).toHaveLength(20);
  });
});

describe('resolveCategoryImageQueries', () => {
  it('returns category specific queries for known category_id', () => {
    const queries = resolveCategoryImageQueries('232c2870-7929-43eb-a909-6cac90203192');
    expect(queries).toContain('turkish kebab doner');
    expect(queries).toHaveLength(3);
  });

  it('falls back to generic queries for unknown category_id', () => {
    const queries = resolveCategoryImageQueries('unknown-category-id');
    expect(queries).toContain('small business storefront');
  });
});

describe('selectDeterministicPoolImage', () => {
  const pool = ['img-1', 'img-2', 'img-3', 'img-4', 'img-5'];

  it('selects a stable image for the same provider_id', () => {
    const first = selectDeterministicPoolImage('provider-123', pool);
    const second = selectDeterministicPoolImage('provider-123', pool);
    expect(first).toBe(second);
  });

  it('selects different images for different provider_ids when pool allows', () => {
    const first = selectDeterministicPoolImage('provider-111', pool);
    const second = selectDeterministicPoolImage('provider-222', pool);
    expect(first).not.toBe(second);
  });
});

describe('createImageCandidatePayload', () => {
  it('creates an image enrichment payload compatible with enrichment_candidates', () => {
    const payload = createImageCandidatePayload({
      providerId: 'provider-1',
      imageUrl: 'https://example.com/image.webp',
      sourceCategory: 'Turkish',
      attribution: {
        photographer: 'Jane Doe',
        profile_url: 'https://unsplash.com/@janedoe',
        photo_url: 'https://unsplash.com/photos/abc',
      },
      currentUrls: [],
    });

    expect(payload.provider_id).toBe('provider-1');
    expect(payload.field_name).toBe('provider_images');
    expect(payload.enrichment_type).toBe('image');
    expect(payload.source).toBe('unsplash');
    expect(payload.proposed_value).toEqual({ urls: ['https://example.com/image.webp'] });
  });
});