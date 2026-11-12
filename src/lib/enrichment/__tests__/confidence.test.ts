import { describe, expect, it } from 'vitest';
import { computeConfidenceScore, AUTO_APPLY_CONFIDENCE_THRESHOLD } from '../confidence';

describe('computeConfidenceScore', () => {
  it('returns 100 for identical names', () => {
    expect(computeConfidenceScore('Pizza Palace', 'Pizza Palace')).toBe(100);
  });

  it('returns 100 for names differing only by case', () => {
    expect(computeConfidenceScore('pizza palace', 'PIZZA PALACE')).toBe(100);
  });

  it('returns high score for names differing by GmbH suffix', () => {
    const score = computeConfidenceScore('Pizza Palace GmbH', 'Pizza Palace');
    expect(score).toBeGreaterThanOrEqual(AUTO_APPLY_CONFIDENCE_THRESHOLD);
  });

  it('returns 0 for completely different names', () => {
    expect(computeConfidenceScore('Pizza Palace', 'Burger King')).toBeLessThan(50);
  });

  it('returns 0 when either name is empty', () => {
    expect(computeConfidenceScore('', 'Pizza Palace')).toBe(0);
    expect(computeConfidenceScore('Pizza Palace', '')).toBe(0);
  });

  it('returns integer between 0 and 100', () => {
    const score = computeConfidenceScore('Pizza Palast', 'Pizza Palace');
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('AUTO_APPLY_CONFIDENCE_THRESHOLD', () => {
  it('is 85', () => {
    expect(AUTO_APPLY_CONFIDENCE_THRESHOLD).toBe(85);
  });
});
