import { describe, it, expect } from 'vitest';

import { classifyAttestation, HALAL_ATTESTATION_FIELDS } from '@/services/admin/halal-gate';

/**
 * Pure truth table for the merged halal-gate classifier (#548).
 * true = compliant, false = denied, null/undefined = unanswered.
 * Approval requires all three fields true — every other combination fails.
 */
const T = true as const;
const F = false as const;
const N = null;

const COMBINATIONS: Array<{
  no_alcohol: boolean | null;
  no_pork: boolean | null;
  no_gambling: boolean | null;
}> = [];
for (const a of [T, F, N])
  for (const p of [T, F, N])
    for (const g of [T, F, N]) COMBINATIONS.push({ no_alcohol: a, no_pork: p, no_gambling: g });

describe('classifyAttestation — 27-combination truth table', () => {
  it.each(COMBINATIONS)('no_alcohol=%s-ish no_pork=%s-ish no_gambling=%s-ish', (values) => {
    const result = classifyAttestation(values);

    const expectedDenied = HALAL_ATTESTATION_FIELDS.filter((f) => values[f] === false);
    const expectedUnanswered = HALAL_ATTESTATION_FIELDS.filter((f) => values[f] == null);

    expect(result.denied).toEqual(expectedDenied);
    expect(result.unanswered).toEqual(expectedUnanswered);
    expect(result.missing).toEqual([...expectedDenied, ...expectedUnanswered]);
    expect(result.allAttested).toBe(expectedDenied.length === 0 && expectedUnanswered.length === 0);
  });

  it('treats an absent key the same as null (unanswered, not denied)', () => {
    const result = classifyAttestation({ no_alcohol: true, no_pork: true });
    expect(result.unanswered).toEqual(['no_gambling']);
    expect(result.denied).toEqual([]);
    expect(result.allAttested).toBe(false);
  });

  it('labels every bucket with the human-readable field label', () => {
    const result = classifyAttestation({
      no_alcohol: false,
      no_pork: null,
      no_gambling: true,
    });
    expect(result.deniedLabels).toEqual(['Kein Alkohol']);
    expect(result.unansweredLabels).toEqual(['Kein verbotenes Fleisch']);
    expect(result.missingLabels).toEqual(['Kein Alkohol', 'Kein verbotenes Fleisch']);
  });
});
