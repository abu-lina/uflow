/**
 * Plan 229 - Provider count: search service returns totalCount
 *
 * Source-level tests verifying the searchProvidersAndCommunityServices function
 * return type includes totalCount from the search.ts module.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const searchSrc = readFileSync(resolve(__dirname, '../../services/providers/search.ts'), 'utf-8');

const typesSrc = readFileSync(resolve(__dirname, '../../services/providers/types.ts'), 'utf-8');

describe('Plan 229 - search.ts totalCount support', () => {
  it('searchProvidersOnly returns totalCount in its result', () => {
    // The function should return { results, hasMore, totalCount }
    expect(searchSrc).toContain('totalCount');
  });

  it('uses count: "exact" in the Supabase query', () => {
    // The searchProviders function should use head: true or count: 'exact'
    expect(searchSrc).toMatch(/count:\s*['"]exact['"]/);
  });
});

describe('Plan 229 - types.ts totalCount', () => {
  it('exports a type or interface that includes totalCount', () => {
    expect(typesSrc).toContain('totalCount');
  });
});
