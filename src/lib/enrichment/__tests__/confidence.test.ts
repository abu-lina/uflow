import { describe, expect, it } from 'vitest';
import { computeConfidenceScore, getAutoApplyThreshold } from '../confidence';

describe('computeConfidenceScore', () => {
  it('returns 100 for identical names', () => {
    expect(computeConfidenceScore('Pizza Palace', 'Pizza Palace')).toBe(100);
  });

  it('returns 100 for names differing only by case', () => {
    expect(computeConfidenceScore('pizza palace', 'PIZZA PALACE')).toBe(100);
  });

  it('returns high score for names differing by GmbH suffix', () => {
    const score = computeConfidenceScore('Pizza Palace GmbH', 'Pizza Palace');
    expect(score).toBeGreaterThanOrEqual(getAutoApplyThreshold());
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

describe('getAutoApplyThreshold', () => {
  it('defaults to 85 when env var is not set', () => {
    delete process.env.ENRICHMENT_CONFIDENCE_THRESHOLD;
    expect(getAutoApplyThreshold()).toBe(85);
  });

  it('reads ENRICHMENT_CONFIDENCE_THRESHOLD env var', () => {
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '70';
    expect(getAutoApplyThreshold()).toBe(70);
    delete process.env.ENRICHMENT_CONFIDENCE_THRESHOLD;
  });

  it('falls back to default for invalid env values', () => {
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = 'abc';
    expect(getAutoApplyThreshold()).toBe(85);
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '150';
    expect(getAutoApplyThreshold()).toBe(85);
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '-5';
    expect(getAutoApplyThreshold()).toBe(85);
    delete process.env.ENRICHMENT_CONFIDENCE_THRESHOLD;
  });

  it('rejects values below minimum floor of 50', () => {
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '0';
    expect(getAutoApplyThreshold()).toBe(85);
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '49';
    expect(getAutoApplyThreshold()).toBe(85);
    process.env.ENRICHMENT_CONFIDENCE_THRESHOLD = '50';
    expect(getAutoApplyThreshold()).toBe(50);
    delete process.env.ENRICHMENT_CONFIDENCE_THRESHOLD;
  });
});
