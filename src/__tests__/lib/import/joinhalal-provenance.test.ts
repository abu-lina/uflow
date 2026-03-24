/**
 * TDD tests for Plan 058: JoinHalal legacy provenance recovery.
 *
 * Tests the matching logic that deterministically links legacy DB rows
 * back to current JoinHalal detail pages using identity signals.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeMatchKey,
  matchLegacyProviders,
  auditStaleCloneOverlap,
  type CorpusEntry,
  type LegacyProviderRow,
} from '@/lib/import/joinhalal';

// ---------------------------------------------------------------------------
// normalizeMatchKey
// ---------------------------------------------------------------------------

describe('normalizeMatchKey (Plan 058)', () => {
  it('normalizes name and city to lowercase trimmed key', () => {
    expect(normalizeMatchKey('Triple B Burger Brothers', 'Stuttgart')).toBe(
      'triple b burger brothers|stuttgart'
    );
  });

  it('handles null city', () => {
    expect(normalizeMatchKey('My Restaurant', null)).toBe('my restaurant|');
  });

  it('trims whitespace', () => {
    expect(normalizeMatchKey('  Foo Bar  ', '  Berlin  ')).toBe('foo bar|berlin');
  });

  it('collapses multiple internal spaces', () => {
    expect(normalizeMatchKey('Foo   Bar', 'Berlin')).toBe('foo bar|berlin');
  });

  it('handles German umlauts consistently (no normalization)', () => {
    expect(normalizeMatchKey('Bäckerei Müller', 'München')).toBe(
      'bäckerei müller|münchen'
    );
  });
});

// ---------------------------------------------------------------------------
// matchLegacyProviders
// ---------------------------------------------------------------------------

describe('matchLegacyProviders (Plan 058)', () => {
  const corpus: CorpusEntry[] = [
    {
      url: 'https://joinhalal.com/locations/restaurant/triple-b-burger-brothers-stuttgart-mitte-5990/',
      slug: 'triple-b-burger-brothers-stuttgart-mitte-5990',
      postId: '5990',
      name: 'Triple B Burger Brothers Stuttgart Mitte',
      city: 'Stuttgart',
      phone: '+4971112345',
      website: 'https://triple-b.de',
    },
    {
      url: 'https://joinhalal.com/locations/restaurant/dakju-korean-chicken-25247/',
      slug: 'dakju-korean-chicken-25247',
      postId: '25247',
      name: 'Dakju Korean Chicken',
      city: 'Berlin',
      phone: '+493012345',
      website: 'https://dakju.de',
    },
    {
      url: 'https://joinhalal.com/locations/restaurant/al-sham-1-1234/',
      slug: 'al-sham-1-1234',
      postId: '1234',
      name: 'Al-Sham 1',
      city: 'Berlin',
      phone: null,
      website: null,
    },
  ];

  it('matches by import_source_id (postId) when available', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-1',
        provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
        address_city: 'Stuttgart',
        contact_phone: '+4971112345',
        social_website: 'https://triple-b.de',
        import_source_id: '5990',
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].providerId).toBe('provider-1');
    expect(result.matched[0].joinHalalUrl).toBe(
      'https://joinhalal.com/locations/restaurant/triple-b-burger-brothers-stuttgart-mitte-5990/'
    );
    expect(result.matched[0].matchMethod).toBe('import_source_id');
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  it('matches by normalized name + city when no postId', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-2',
        provider_name: 'Dakju Korean Chicken',
        address_city: 'Berlin',
        contact_phone: null,
        social_website: null,
        import_source_id: null,
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].providerId).toBe('provider-2');
    expect(result.matched[0].matchMethod).toBe('name_city');
    expect(result.matched[0].joinHalalUrl).toContain('dakju-korean-chicken');
  });

  it('reports ambiguous when multiple corpus entries match same name+city', () => {
    const ambiguousCorpus: CorpusEntry[] = [
      ...corpus,
      {
        url: 'https://joinhalal.com/locations/restaurant/dakju-korean-chicken-copy-99999/',
        slug: 'dakju-korean-chicken-copy-99999',
        postId: '99999',
        name: 'Dakju Korean Chicken',
        city: 'Berlin',
        phone: null,
        website: null,
      },
    ];

    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-2',
        provider_name: 'Dakju Korean Chicken',
        address_city: 'Berlin',
        contact_phone: null,
        social_website: null,
        import_source_id: null,
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, ambiguousCorpus);
    expect(result.matched).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(1);
    expect(result.ambiguous[0].providerId).toBe('provider-2');
    expect(result.ambiguous[0].candidateCount).toBe(2);
  });

  it('reports unmatched when no corpus entry matches', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-no-match',
        provider_name: 'Totally Unknown Restaurant',
        address_city: 'Nowhere',
        contact_phone: null,
        social_website: null,
        import_source_id: null,
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].providerId).toBe('provider-no-match');
  });

  it('skips non-pending providers', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-reviewed',
        provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
        address_city: 'Stuttgart',
        contact_phone: null,
        social_website: null,
        import_source_id: '5990',
        review_status: 'approved',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    expect(result.matched).toHaveLength(0);
    expect(result.skippedReviewed).toHaveLength(1);
  });

  it('matched entries include evidence fields', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-1',
        provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
        address_city: 'Stuttgart',
        contact_phone: '+4971112345',
        social_website: 'https://triple-b.de',
        import_source_id: '5990',
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    const match = result.matched[0];
    expect(match.evidence).toBeDefined();
    expect(match.evidence.providerName).toBe('Triple B Burger Brothers Stuttgart Mitte');
    expect(match.evidence.corpusName).toBe('Triple B Burger Brothers Stuttgart Mitte');
  });

  it('prefers import_source_id match over name+city match', () => {
    const legacy: LegacyProviderRow[] = [
      {
        id: 'provider-with-id',
        provider_name: 'Some Different Name',
        address_city: 'Stuttgart',
        contact_phone: null,
        social_website: null,
        import_source_id: '5990',
        review_status: 'pending',
      },
    ];

    const result = matchLegacyProviders(legacy, corpus);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].matchMethod).toBe('import_source_id');
  });
});

// ---------------------------------------------------------------------------
// auditStaleCloneOverlap (Plan 058 — Step 6)
// ---------------------------------------------------------------------------

describe('auditStaleCloneOverlap (Plan 058)', () => {
  const legacyRows: LegacyProviderRow[] = [
    {
      id: 'legacy-1',
      provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
      address_city: 'Stuttgart',
      contact_phone: '+4971112345',
      social_website: 'https://triple-b.de',
      import_source_id: '5990',
      review_status: 'pending',
    },
    {
      id: 'legacy-2',
      provider_name: 'Dakju Korean Chicken',
      address_city: 'Berlin',
      contact_phone: null,
      social_website: null,
      import_source_id: null,
      review_status: 'pending',
    },
    {
      id: 'legacy-3',
      provider_name: 'Unique Legacy Only',
      address_city: 'Hamburg',
      contact_phone: null,
      social_website: null,
      import_source_id: null,
      review_status: 'approved',
    },
  ];

  const staleCloneRows: LegacyProviderRow[] = [
    {
      id: 'stale-1',
      provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
      address_city: 'Stuttgart',
      contact_phone: '+4971112345',
      social_website: 'https://triple-b.de',
      import_source_id: '5990',
      review_status: 'pending',
    },
    {
      id: 'stale-2',
      provider_name: 'Dakju Korean Chicken',
      address_city: 'Berlin',
      contact_phone: null,
      social_website: null,
      import_source_id: '25247',
      review_status: 'pending',
    },
    {
      id: 'stale-3',
      provider_name: 'Brand New Restaurant',
      address_city: 'Munich',
      contact_phone: null,
      social_website: null,
      import_source_id: '99999',
      review_status: 'pending',
    },
  ];

  it('classifies stale-clone rows into exact, partial, and unique categories', () => {
    const audit = auditStaleCloneOverlap(legacyRows, staleCloneRows);

    // stale-1 matches legacy-1 by import_source_id '5990' → exact duplicate
    expect(audit.exactDuplicates).toHaveLength(1);
    expect(audit.exactDuplicates[0].staleCloneId).toBe('stale-1');
    expect(audit.exactDuplicates[0].legacyId).toBe('legacy-1');

    // stale-2 matches legacy-2 by name+city → partial overlap
    expect(audit.partialOverlaps).toHaveLength(1);
    expect(audit.partialOverlaps[0].staleCloneId).toBe('stale-2');
    expect(audit.partialOverlaps[0].legacyId).toBe('legacy-2');

    // stale-3 has no legacy counterpart → unique
    expect(audit.uniqueToStaleClone).toHaveLength(1);
    expect(audit.uniqueToStaleClone[0].id).toBe('stale-3');
  });

  it('produces a recommendation string', () => {
    const audit = auditStaleCloneOverlap(legacyRows, staleCloneRows);

    expect(audit.recommendation).toBeTruthy();
    expect(typeof audit.recommendation).toBe('string');
    expect(audit.recommendation.length).toBeGreaterThan(20);
  });

  it('handles empty stale-clone set', () => {
    const audit = auditStaleCloneOverlap(legacyRows, []);

    expect(audit.exactDuplicates).toHaveLength(0);
    expect(audit.partialOverlaps).toHaveLength(0);
    expect(audit.uniqueToStaleClone).toHaveLength(0);
    expect(audit.recommendation).toContain('No stale-clone rows');
  });

  it('handles empty legacy set', () => {
    const audit = auditStaleCloneOverlap([], staleCloneRows);

    expect(audit.exactDuplicates).toHaveLength(0);
    expect(audit.partialOverlaps).toHaveLength(0);
    expect(audit.uniqueToStaleClone).toHaveLength(3);
  });
});
