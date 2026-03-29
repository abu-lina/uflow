/**
 * Tests for src/lib/enrichment/joinhalal-enricher.ts
 *
 * TDD: Tests written BEFORE implementation.
 * Plan 065 — Milestone 2: Conflict detection, candidate building, dedup.
 */

import { describe, expect, it } from 'vitest';
import {
  detectConflict,
  buildEnrichmentCandidates,
  shouldDedup,
  type EnrichmentCandidate,
  type ProviderSnapshot,
  type ParsedEnrichmentData,
} from '@/lib/enrichment/joinhalal-enricher';

// ─── detectConflict ──────────────────────────────────────────────────────────

describe('detectConflict', () => {
  it('returns "no-change" when current and proposed are identical (string)', () => {
    expect(detectConflict('+49123456', '+49123456')).toBe('no-change');
  });

  it('returns "no-change" when current and proposed arrays are identical', () => {
    const ids = ['uuid-1', 'uuid-2'];
    expect(detectConflict(ids, [...ids])).toBe('no-change');
  });

  it('returns "additive" when current is null/undefined and proposed has value', () => {
    expect(detectConflict(null, '+49123456')).toBe('additive');
    expect(detectConflict(undefined, '+49123456')).toBe('additive');
  });

  it('returns "additive" when current is empty array and proposed has items', () => {
    expect(detectConflict([], ['uuid-1'])).toBe('additive');
  });

  it('returns "conflict" when both have different non-empty values', () => {
    expect(detectConflict('+49111111', '+49222222')).toBe('conflict');
  });

  it('returns "conflict" when arrays differ', () => {
    expect(detectConflict(['uuid-1'], ['uuid-2'])).toBe('conflict');
  });

  it('returns "no-change" when both are null', () => {
    expect(detectConflict(null, null)).toBe('no-change');
  });

  it('returns "no-change" when both are empty arrays', () => {
    expect(detectConflict([], [])).toBe('no-change');
  });
});

// ─── buildEnrichmentCandidates ───────────────────────────────────────────────

describe('buildEnrichmentCandidates', () => {
  const provider: ProviderSnapshot = {
    provider_id: 'prov-001',
    offers_ids: ['offer-a'],
    contact_phone: '+49111',
    social_website: 'https://old.example.com',
    social_instagram: null,
    address_street: 'Hauptstr. 1',
    address_zip: '70173',
    address_city: 'Stuttgart',
    address_country: 'DE',
  };

  it('returns empty array when parsed data matches current provider exactly', () => {
    const parsed: ParsedEnrichmentData = {
      offers_ids: ['offer-a'],
      contact_phone: '+49111',
      social_website: 'https://old.example.com',
    };
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    expect(candidates).toHaveLength(0);
  });

  it('creates a candidate for each changed field', () => {
    const parsed: ParsedEnrichmentData = {
      offers_ids: ['offer-a', 'offer-b'],
      contact_phone: '+49222',
    };
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    expect(candidates.length).toBe(2);
    expect(candidates.map((c) => c.field_name).sort()).toEqual(['contact_phone', 'offers_ids']);
  });

  it('creates additive candidate when filling a null field', () => {
    const parsed: ParsedEnrichmentData = {
      social_instagram: '@restaurant',
    };
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].field_name).toBe('social_instagram');
    expect(candidates[0].proposed_value).toBe('@restaurant');
    expect(candidates[0].current_value).toBeNull();
  });

  it('never creates candidates for admin-controlled fields even if parsed data includes them', () => {
    const parsed: ParsedEnrichmentData = {
      review_status: 'approved',
      needs_ids: ['need-1'],
      offers_ids: ['offer-new'],
    } as unknown as ParsedEnrichmentData;
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    const fieldNames = candidates.map((c) => c.field_name);
    expect(fieldNames).not.toContain('review_status');
    expect(fieldNames).not.toContain('needs_ids');
  });

  it('snapshots current value in the candidate', () => {
    const parsed: ParsedEnrichmentData = {
      contact_phone: '+49999',
    };
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    expect(candidates[0].current_value).toBe('+49111');
    expect(candidates[0].proposed_value).toBe('+49999');
  });

  it('sets source and source_url on candidates', () => {
    const parsed: ParsedEnrichmentData = { contact_phone: '+49999' };
    const candidates = buildEnrichmentCandidates(provider, parsed, 'joinhalal', 'https://joinhalal.com/page');
    expect(candidates[0].source).toBe('joinhalal');
    expect(candidates[0].source_url).toBe('https://joinhalal.com/page');
  });
});

// ─── shouldDedup ─────────────────────────────────────────────────────────────

describe('shouldDedup', () => {
  const base: EnrichmentCandidate = {
    provider_id: 'prov-001',
    field_name: 'offers_ids',
    source: 'joinhalal',
    source_url: 'https://joinhalal.com/page',
    proposed_value: ['offer-b'],
    current_value: ['offer-a'],
  };

  it('returns true when existing pending candidate has same provider+field+source', () => {
    const existing = { ...base, status: 'pending' as const };
    const incoming = { ...base, proposed_value: ['offer-c'] };
    expect(shouldDedup(existing, incoming)).toBe(true);
  });

  it('returns false when existing candidate is already applied', () => {
    const existing = { ...base, status: 'applied' as const };
    const incoming = { ...base, proposed_value: ['offer-c'] };
    expect(shouldDedup(existing, incoming)).toBe(false);
  });

  it('returns false when existing candidate is rejected', () => {
    const existing = { ...base, status: 'rejected' as const };
    const incoming = { ...base };
    expect(shouldDedup(existing, incoming)).toBe(false);
  });

  it('returns false when field_name differs', () => {
    const existing = { ...base, status: 'pending' as const };
    const incoming = { ...base, field_name: 'contact_phone' };
    expect(shouldDedup(existing, incoming)).toBe(false);
  });

  it('returns false when source differs', () => {
    const existing = { ...base, status: 'pending' as const };
    const incoming = { ...base, source: 'lieferando' };
    expect(shouldDedup(existing, incoming)).toBe(false);
  });
});
