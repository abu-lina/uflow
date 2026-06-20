import { describe, it, expect } from 'vitest';
import { deriveReviewStatus } from '@/utils/halal-derivation';

describe('deriveReviewStatus', () => {
  it('returns approved when all three are true', () => {
    expect(deriveReviewStatus(true, true, true)).toBe('approved');
  });

  it('returns rejected when noAlcohol is false', () => {
    expect(deriveReviewStatus(false, true, true)).toBe('rejected');
  });

  it('returns rejected when noPork is false', () => {
    expect(deriveReviewStatus(true, false, true)).toBe('rejected');
  });

  it('returns rejected when noGambling is false', () => {
    expect(deriveReviewStatus(true, true, false)).toBe('rejected');
  });

  it('returns rejected when two are false', () => {
    expect(deriveReviewStatus(false, false, true)).toBe('rejected');
  });

  it('returns rejected when all are false', () => {
    expect(deriveReviewStatus(false, false, false)).toBe('rejected');
  });
});
