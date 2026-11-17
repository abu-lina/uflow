import { describe, expect, it } from 'vitest';
import { computeSealTier } from '@/features/providers/components/ProofTierCard';

// computeSealTier agreement — the TypeScript filter must agree with the UI tier derivation.
const TIER_CASES = [
  {
    label: 'no verification at all returns null',
    verification_method: null,
    has_certificate: false,
    certificate_url: null,
    no_alcohol: false,
    no_pork: false,
    no_gambling: false,
    expected: null,
  },
  {
    label: 'online + alcohol attestation only returns bronze',
    verification_method: 'online' as const,
    has_certificate: false,
    certificate_url: null,
    no_alcohol: true,
    no_pork: false,
    no_gambling: false,
    expected: 'bronze',
  },
  {
    label: 'onsite + two attestations returns silver',
    verification_method: 'onsite' as const,
    has_certificate: false,
    certificate_url: null,
    no_alcohol: true,
    no_pork: true,
    no_gambling: false,
    expected: 'silver',
  },
  {
    label: 'certificate with URL returns gold',
    verification_method: 'onsite' as const,
    has_certificate: true,
    certificate_url: 'https://example.com/cert.pdf',
    no_alcohol: true,
    no_pork: true,
    no_gambling: true,
    expected: 'gold',
  },
  {
    label: 'certificate flag set but no URL returns silver (review focus #3)',
    verification_method: 'onsite' as const,
    has_certificate: true,
    certificate_url: null,
    no_alcohol: true,
    no_pork: true,
    no_gambling: false,
    expected: 'silver',
  },
  {
    label: 'onsite + no attestations returns null (review focus #2)',
    verification_method: 'onsite' as const,
    has_certificate: false,
    certificate_url: null,
    no_alcohol: false,
    no_pork: false,
    no_gambling: false,
    expected: null,
  },
  {
    label: 'online + no attestations returns null',
    verification_method: 'online' as const,
    has_certificate: false,
    certificate_url: null,
    no_alcohol: false,
    no_pork: false,
    no_gambling: false,
    expected: null,
  },
] as const;

describe('computeSealTier agreement', () => {
  it.each(TIER_CASES)('$label', (row) => {
    const tier = computeSealTier(
      row.verification_method,
      row.has_certificate,
      { noAlcohol: row.no_alcohol, noPork: row.no_pork, noGambling: row.no_gambling },
      row.certificate_url,
    );
    expect(tier).toBe(row.expected);
  });
});
