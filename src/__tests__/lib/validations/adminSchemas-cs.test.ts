/**
 * Unit tests for CS-related Zod schemas in adminSchemas.ts
 *
 * Tests exercise real schema constraints — NOT mocked — to verify
 * validation rules enforced at the API boundary.
 *
 * Covers: communityServiceEditUpdateSchema, communityServiceReviewUpdateSchema
 */

import { describe, it, expect, vi } from 'vitest';

// Undo the global zod mock from setup.ts so real Zod validator runs
vi.unmock('zod');

import {
  communityServiceEditUpdateSchema,
  communityServiceReviewUpdateSchema,
} from '@/lib/validations/adminSchemas';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

// ---------------------------------------------------------------------------
// communityServiceEditUpdateSchema
// ---------------------------------------------------------------------------

describe('communityServiceEditUpdateSchema', () => {
  it('accepts a full valid payload', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      communityServiceName: 'Test Service',
      communityServiceDescription: 'A description.',
      categoryId: VALID_UUID,
      addressStreet: 'Musterstraße 1',
      addressZip: '12345',
      addressCity: 'München',
      addressCountry: 'Germany',
      contactEmail: 'info@example.com',
      contactPhone: '+49 89 1234567',
      socialWebsite: 'https://example.com',
      socialInstagram: 'test_service',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a minimal payload (only required communityServiceId)', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing communityServiceId', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceName: 'Test Service',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('communityServiceId');
  });

  it('rejects an invalid UUID for communityServiceId', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Invalid community service ID format');
  });

  it('rejects an invalid UUID for categoryId', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      categoryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('categoryId');
  });

  it('rejects serviceName longer than 200 characters', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      serviceName: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email in contactEmail', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      contactEmail: 'not-valid-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid URL in socialWebsite', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      socialWebsite: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('allows null for nullable optional fields', () => {
    const result = communityServiceEditUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      communityServiceDescription: null,
      contactEmail: null,
      socialWebsite: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// communityServiceReviewUpdateSchema
// ---------------------------------------------------------------------------

describe('communityServiceReviewUpdateSchema', () => {
  it('accepts approve without feedback', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'approved',
    });
    expect(result.success).toBe(true);
  });

  it('accepts needs_revision without feedback', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'needs_revision',
    });
    expect(result.success).toBe(true);
  });

  it('accepts rejected WITH non-empty feedback', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'rejected',
      reviewFeedback: 'Missing contact information.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rejected WITHOUT feedback (refinement enforces this)', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'rejected',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Rejection reason is required');
  });

  it('rejects rejected WITH empty-string feedback', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'rejected',
      reviewFeedback: '   ',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Rejection reason is required');
  });

  it('rejects an invalid communityServiceId (not UUID)', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: 'bad-id',
      reviewStatus: 'approved',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Invalid community service ID format');
  });

  it('rejects an invalid reviewStatus value', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'pending',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(
      'reviewStatus must be one of: approved, rejected, needs_revision'
    );
  });

  it('rejects reviewFeedback exceeding 5000 characters', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'rejected',
      reviewFeedback: 'A'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts approve WITH optional feedback (feedback ignored semantically)', () => {
    const result = communityServiceReviewUpdateSchema.safeParse({
      communityServiceId: VALID_UUID,
      reviewStatus: 'approved',
      reviewFeedback: 'Optional note',
    });
    expect(result.success).toBe(true);
  });
});
