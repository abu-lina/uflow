import { describe, expect, it } from 'vitest';

import {
  CATEGORY_IMAGE_POOL,
  createImageCandidatePayload,
  resolveCategoryImageQueries,
  selectDeterministicPoolImage,
} from '@/lib/enrichment/image-enrichment';

describe('CATEGORY_IMAGE_POOL', () => {
  it('contains all approved category mappings', () => {
    expect(Object.keys(CATEGORY_IMAGE_POOL)).toHaveLength(55);
  });
});

describe('resolveCategoryImageQueries', () => {
  it('returns category specific queries for known category_id', () => {
    const queries = resolveCategoryImageQueries('8204a370-26fb-4c8d-8183-2e5550a09dcb');
    expect(queries).toContain('afghan food kabuli');
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

describe('CATEGORY_IMAGE_POOL — post-fix regression', () => {
  it('resolves queries for a formerly-stale category (Turkish, now with updated UUID)', () => {
    const queries = resolveCategoryImageQueries('65a3e4e8-5dac-41a9-94c4-f65b33c6e59b');
    expect(queries).toContain('turkish kebab doner');
    expect(queries).toHaveLength(3);
  });

  it('resolves queries for a newly-added cuisine (French)', () => {
    const queries = resolveCategoryImageQueries('9a7971c1-8d86-42c8-b668-e232487b90dc');
    expect(queries).toContain('french cuisine plated');
    expect(queries).toHaveLength(3);
  });

  it('falls back to DEFAULT for a UUID not in the pool', () => {
    const queries = resolveCategoryImageQueries('00000000-0000-0000-0000-000000000000');
    expect(queries).toContain('small business storefront');
  });

  it('has no duplicate UUID keys in the pool', () => {
    const keys = Object.keys(CATEGORY_IMAGE_POOL);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('does not contain removed stale UUIDs', () => {
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('b35965ed-fdb0-4bc5-a872-ab3bbc5139de');
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae');
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f577c7ce-d2e2-46ba-b494-57b038aa4b48');
  });
});