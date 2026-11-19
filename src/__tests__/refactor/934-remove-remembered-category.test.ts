/**
 * #934 — Remove remembered Category from search context
 *
 * After #917, the results page takes its Category from the URL only.
 * selectedCategory/setSelectedCategory in SearchProvider are dead state.
 * These tests verify the dead code is gone.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../../..');

describe('#934 AC1 — SearchProvider drops selectedCategory', () => {
  const providerSrc = readFileSync(resolve(SRC, 'src/providers/search-provider.tsx'), 'utf-8');

  it('SearchContextType does not include selectedCategory', () => {
    expect(providerSrc).not.toMatch(/selectedCategory/);
  });

  it('SearchContextType does not include setSelectedCategory', () => {
    expect(providerSrc).not.toMatch(/setSelectedCategory/);
  });
});

describe('#934 AC1 — ProvidersContent does not write to search category context', () => {
  const contentSrc = readFileSync(
    resolve(SRC, 'src/app/(public)/providers/ProvidersContent.tsx'),
    'utf-8',
  );

  it('does not destructure selectedCategory from useSearch', () => {
    expect(contentSrc).not.toMatch(/selectedCategory/);
  });

  it('does not call setSelectedCategory', () => {
    expect(contentSrc).not.toMatch(/setSelectedCategory/);
  });
});

describe('#934 AC2 — FigmaSearchBar is deleted', () => {
  it('FigmaSearchBar.tsx does not exist', () => {
    expect(existsSync(resolve(SRC, 'src/features/search/components/FigmaSearchBar.tsx'))).toBe(
      false,
    );
  });

  it('FigmaSearchBar.test.tsx does not exist', () => {
    expect(existsSync(resolve(SRC, 'src/features/search/components/FigmaSearchBar.test.tsx'))).toBe(
      false,
    );
  });
});
