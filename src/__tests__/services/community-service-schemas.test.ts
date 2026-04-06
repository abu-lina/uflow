/**
 * TDD tests for communityServiceEditUpdateSchema and communityServiceReviewUpdateSchema
 * Plan 083 — M1
 *
 * These tests import from @/lib/validations/adminSchemas which exists but the new
 * exports don't yet — will fail with "communityServiceEditUpdateSchema is not a function"
 * (undefined) until implemented.
 */

import { describe, it, expect, vi } from 'vitest';

// The global setup.ts mocks 'zod' with a minimal stub that lacks uuid/url/enum etc.
// Restore the real module for schema validation tests.
vi.unmock('zod');

// Import after mocks — new exports don't exist yet
import {
  communityServiceEditUpdateSchema,
  communityServiceReviewUpdateSchema,
} from '@/lib/validations/adminSchemas';

const VALID_CS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('communityServiceEditUpdateSchema', () => {
  it('accepts minimal valid payload (only communityServiceId)', () => {
    const result = communityServiceEditUpdateSchema.parse({
      communityServiceId: VALID_CS_ID,
    });
    expect(result.communityServiceId).toBe(VALID_CS_ID);
  });

  it('rejects invalid UUID for communityServiceId', () => {
    expect(() =>
      communityServiceEditUpdateSchema.parse({ communityServiceId: 'not-a-uuid' })
    ).toThrow();
  });

  it('accepts communityServiceImages as string array', () => {
    const result = communityServiceEditUpdateSchema.parse({
      communityServiceId: VALID_CS_ID,
      communityServiceImages: ['https://example.com/img.jpg'],
    });
    expect(result.communityServiceImages).toEqual(['https://example.com/img.jpg']);
  });

  it('rejects communityServiceImages as JSON string (wrong format)', () => {
    expect(() =>
      communityServiceEditUpdateSchema.parse({
        communityServiceId: VALID_CS_ID,
        communityServiceImages: '{"urls":["https://example.com/img.jpg"]}',
      })
    ).toThrow();
  });

  it('accepts all editable fields', () => {
    const payload = {
      communityServiceId: VALID_CS_ID,
      serviceName: 'Test Service',
      serviceDescription: 'A great service',
      categoryId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      addressStreet: 'Hauptstraße 1',
      addressZip: '10115',
      addressCity: 'Berlin',
      addressCountry: 'Deutschland',
      contactEmail: 'test@example.com',
      contactPhone: '+49123456789',
      socialWebsite: 'https://example.com',
      socialInstagram: '@example',
      offersIds: ['cccccccc-dddd-eeee-ffff-000000000001'],
      needsIds: ['cccccccc-dddd-eeee-ffff-000000000002'],
      communityServiceImages: ['https://example.com/img.jpg'],
    };
    expect(() => communityServiceEditUpdateSchema.parse(payload)).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() =>
      communityServiceEditUpdateSchema.parse({
        communityServiceId: VALID_CS_ID,
        contactEmail: 'not-an-email',
      })
    ).toThrow();
  });

  it('rejects invalid URL for socialWebsite', () => {
    expect(() =>
      communityServiceEditUpdateSchema.parse({
        communityServiceId: VALID_CS_ID,
        socialWebsite: 'not-a-url',
      })
    ).toThrow();
  });
});

describe('communityServiceReviewUpdateSchema', () => {
  it('accepts approved without feedback', () => {
    const result = communityServiceReviewUpdateSchema.parse({
      communityServiceId: VALID_CS_ID,
      reviewStatus: 'approved',
    });
    expect(result.reviewStatus).toBe('approved');
  });

  it('accepts rejected with feedback', () => {
    const result = communityServiceReviewUpdateSchema.parse({
      communityServiceId: VALID_CS_ID,
      reviewStatus: 'rejected',
      reviewFeedback: 'Does not meet guidelines',
    });
    expect(result.reviewStatus).toBe('rejected');
    expect(result.reviewFeedback).toBe('Does not meet guidelines');
  });

  it('rejects rejected without feedback', () => {
    expect(() =>
      communityServiceReviewUpdateSchema.parse({
        communityServiceId: VALID_CS_ID,
        reviewStatus: 'rejected',
      })
    ).toThrow();
  });

  it('rejects invalid reviewStatus', () => {
    expect(() =>
      communityServiceReviewUpdateSchema.parse({
        communityServiceId: VALID_CS_ID,
        reviewStatus: 'invalid_status',
      })
    ).toThrow();
  });

  it('accepts optional expectedUpdatedAt', () => {
    const result = communityServiceReviewUpdateSchema.parse({
      communityServiceId: VALID_CS_ID,
      reviewStatus: 'approved',
      expectedUpdatedAt: '2026-04-06T10:00:00.000Z',
    });
    expect(result.expectedUpdatedAt).toBe('2026-04-06T10:00:00.000Z');
  });
});
